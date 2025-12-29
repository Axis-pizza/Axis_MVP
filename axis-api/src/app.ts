import { Buffer } from 'node:buffer';
globalThis.Buffer = Buffer;
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { Bindings } from './config/env';
import { STRICT_LIST } from './config/constants';
import * as TwitterService from './services/twitter';
import * as AIService from './services/ai';
import * as SolanaService from './services/solana';
import * as AuthService from './services/auth';
import * as UserModel from './models/user';
import * as InviteModel from './models/invite';
import * as VaultModel from './models/vault';

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}))

app.onError((err, c) => {
  console.error(`[Global Error] ${err.message}`, err);

  if (err instanceof HTTPException) {
    return c.json({
      success: false,
      error: err.message,
    }, err.status);
  }

  return c.json({
    success: false,
    error: 'Internal Server Error',
  }, 500);
});

// --- Auth Routes ---

app.get('/auth/twitter', TwitterService.createTwitterAuth);
app.get('/auth/twitter/callback', TwitterService.handleTwitterCallback);

app.post('/auth/social-login', async (c) => {
  try {
    const { provider, email, wallet_address } = await c.req.json();
    
    if (!provider) return c.json({ error: "Provider required" }, 400);

    let user: UserModel.User | null = null;

    // 1. Find existing user
    if (provider === 'solana' && wallet_address) {
      user = await UserModel.findUserByWallet(c.env.axis_db, wallet_address);
    } 
    else if ((provider === 'google' || provider === 'twitter') && email) {
      user = await UserModel.findUserByEmail(c.env.axis_db, email);
    }

    // 2. User exists -> Login
    if (user) {
      if (provider === 'solana' && !user.wallet_address && wallet_address) {
          await UserModel.updateUserWallet(c.env.axis_db, user.id, wallet_address);
          user.wallet_address = wallet_address;
      }
      return c.json({ success: true, isNew: false, user });
    }

    // 3. User does not exist -> Register (Sign Up)
    const newId = crypto.randomUUID();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newInviteCode = `AXIS-${randomSuffix}`;

    await UserModel.createSocialUser(c.env.axis_db, newId, email || null, wallet_address || null, newInviteCode);

    const newUser = {
      id: newId,
      email: email || null,
      wallet_address: wallet_address || null,
      invite_code: newInviteCode
    };

    return c.json({ success: true, isNew: true, user: newUser });

  } catch (e: any) {
    console.error("Social Auth Error:", e);
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.post('/auth/store-otp', async (c) => {
  const { email, code } = await c.req.json();
  const expires = Math.floor(Date.now() / 1000) + 600; // 10 min
  
  const existing = await UserModel.findUserByEmail(c.env.axis_db, email);
  
  if (existing) {
    await UserModel.updateUserOtp(c.env.axis_db, email, code, expires);
  } else {
    const id = crypto.randomUUID();
    await UserModel.createOtpUser(c.env.axis_db, id, email, code, expires);
  }

  return c.json({ success: true });
});

app.post('/auth/verify-otp', async (c) => {
  try {
      const { email, code, inviteCode, walletAddress } = await c.req.json();
      const user = await AuthService.verifyOtpAndProcessInvite(
          c.env.axis_db, 
          email, 
          code, 
          inviteCode, 
          walletAddress
      );
      return c.json({ success: true, user });
  } catch (e: any) {
      return c.json({ success: false, message: e.message }, 400);
  }
});

app.get('/verify-invite', async (c) => {
  const code = c.req.query('code');
  if (!code) return c.json({ valid: false });

  const invite = await InviteModel.findInviteByCode(c.env.axis_db, code);
  
  if (invite) {
    return c.json({ valid: true });
  } else {
    return c.json({ valid: false }, 400);
  }
});

/**
 * 1. 招待コード確認API (User referral check)
 */
app.get('/verify', async (c) => {
  const code = c.req.query('code')
  const valid = await AuthService.verifyUsersInvite(c.env.axis_db, code || "");
  if (valid) {
    return c.json({ valid: true })
  } else {
    return c.json({ valid: false, message: 'Invalid code' }, 404)
  }
})

app.get('/my-invites', async (c) => {
  const email = c.req.query('email');
  if(!email) return c.json([]);

  const user = await UserModel.findUserByEmail(c.env.axis_db, email);
  if(!user) return c.json([]);

  const invites = await InviteModel.findInvitesByCreator(c.env.axis_db, user.id);
  return c.json(invites);
});


// --- User Routes ---

app.post('/register', async (c) => {
  try {
    const { email, wallet_address, invite_code_used } = await c.req.json()

    if (!email || !wallet_address || !invite_code_used) {
      return c.json({ error: 'Missing fields' }, 400)
    }

    // A. Verify Invite Code (Referral)
    // Note: The original code checks 'invites' table via 'users' table? 
    // Wait, original: `SELECT id FROM users WHERE invite_code = ?` -> means invite_code_used is another user's invite code.
    const referrer = await UserModel.findUserByEmail(c.env.axis_db, invite_code_used); 
    // Wait, invite_code_used is a CODE, not email.
    // Original: const referrer = await c.env.axis_db.prepare('SELECT id FROM users WHERE invite_code = ?').bind(invite_code_used).first()
    // I don't have findUserByInviteCode yet. Let's do raw query or add it?
    // Let's use raw query for now to be safe or just replicate the query.
    const referrerUser = await c.env.axis_db.prepare('SELECT id FROM users WHERE invite_code = ?').bind(invite_code_used).first();

    if (!referrerUser) {
      return c.json({ error: 'Invalid invite code' }, 400)
    }

    // B. Check Duplicates
    const existing = await c.env.axis_db.prepare('SELECT id, invite_code FROM users WHERE email = ? OR wallet_address = ?')
      .bind(email, wallet_address)
      .first()

    if (existing) {
       // @ts-ignore
      return c.json({ success: true, user: { id: existing.id, invite_code: existing.invite_code, is_existing: true } })
    }

    // C. Register
    const newId = crypto.randomUUID()
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const newInviteCode = `AXIS-${randomSuffix}`

    // @ts-ignore
    await UserModel.createRegisteredUser(c.env.axis_db, newId, email, wallet_address, newInviteCode, referrerUser.id);

    return c.json({ 
      success: true, 
      user: { 
        id: newId, 
        invite_code: newInviteCode,
        is_existing: false
      } 
    })

  } catch (e) {
    console.error(e)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

app.get('/user', async (c) => {
  const wallet = c.req.query('wallet');
  
  if (!wallet) {
    return c.json({ error: 'Wallet address required' }, 400);
  }

  try {
    const user = await UserModel.findUserByWallet(c.env.axis_db, wallet);
    if (!user) return c.json({}); 

    return c.json({
      username: user.name,
      bio: user.bio,
      pfpUrl: user.avatar_url,
      badges: user.badges ? JSON.parse(user.badges) : []
    });

  } catch (e: any) {
    console.error("Fetch User Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

app.post('/user', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ success: false, error: 'Invalid JSON format' }, 400);
  }

  const { wallet_address, name, bio, avatar_url, badges } = body;

  if (!wallet_address || typeof wallet_address !== 'string') {
    return c.json({ success: false, error: 'Wallet address is required and must be a string' }, 400);
  }
  if (name && name.length > 50) return c.json({ success: false, error: 'Username must be 50 characters or less' }, 400);
  if (bio && bio.length > 200) return c.json({ success: false, error: 'Bio must be 200 characters or less' }, 400);

  try {
    const existing = await UserModel.findUserByWallet(c.env.axis_db, wallet_address);
    if (!existing) {
      return c.json({ success: false, error: "User not found. Please register first." }, 404);
    }

    const badgesStr = Array.isArray(badges) ? JSON.stringify(badges) : (badges || null);

    await UserModel.updateUser(c.env.axis_db, wallet_address, { name, bio, avatar_url, badges: badgesStr });

    return c.json({ success: true, message: "Profile updated successfully" });

  } catch (e: any) {
    console.error("[DB Error]", e);
    if (e.message.includes('UNIQUE constraint failed')) {
      return c.json({ success: false, error: 'This username is already taken' }, 409);
    }
    throw new HTTPException(500, { message: 'Database operation failed' });
  }
});

// --- Vault & Token Routes ---

app.get('/tokens', (c) => {
  console.log(`[Axis Internal] Returning ${STRICT_LIST.length} curated tokens.`);
  return c.json(STRICT_LIST);
});

app.post('/chat', async (c) => {
    try {
        const { history, currentState } = await c.req.json();
        const result = await AIService.processChat(history, currentState, c.env.GOOGLE_API_KEY);
        return c.json(result);
    } catch (e: any) {
        console.error("AI Error:", e);
        return c.json({ message: `System Error: ${e.message}`, uiAction: "NONE", data: {} });
    }
});

app.get('/vaults', async (c) => {
  try {
    const vaults = await VaultModel.getAllVaults(c.env.axis_db);
    return c.json(vaults);
  } catch (e: any) {
    console.error("Fetch Vaults Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

app.post('/vaults', async (c) => {
  try {
    const body = await c.req.json();
    const { name, symbol, description, creator, strategy, fee, minLiquidity, composition, imageUrl } = body;

    // Validation
    if (!name || !creator || !composition) {
      return c.json({ success: false, error: "Missing required fields" }, 400);
    }

    const id = crypto.randomUUID();
    const vaultData = {
        id,
        name,
        symbol,
        description: description || "",
        creator,
        strategy_type: strategy || 'Weekly',
        management_fee: fee || 0.95,
        min_liquidity: minLiquidity || 1000,
        composition: composition, // stored as array, serialized in model
        image_url: imageUrl || null
    };

    await VaultModel.createVault(c.env.axis_db, vaultData);
    return c.json({ success: true, id });

  } catch (e: any) {
    console.error("Create Vault Error:", e);
    return c.json({ success: false, error: e.message }, 500);
  }
});

// --- Faucet ---

app.post("/claim", async (c) => {
  const { wallet_address } = await c.req.json();
  try {
    const { signature, latestBlockhash, connection } = await SolanaService.claimFaucet(c.env.FAUCET_PRIVATE_KEY, wallet_address);

    c.executionCtx.waitUntil(
        SolanaService.confirmTransaction(connection, signature, latestBlockhash)
    );
    
    return c.json({ success: true, signature, message: "Sent 1,000 USDC (Devnet)" });
  } catch (e: any) {
      console.error(e);
      return c.json({ error: "Transfer failed: " + e.message }, 500);
  }
});

export default app
