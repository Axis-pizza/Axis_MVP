import { Hono } from 'hono';
import { Bindings } from '../config/env';
import * as UserModel from '../models/user';
import * as InviteModel from '../models/invite';
import { HTTPException } from 'hono/http-exception';
import { sendInviteEmail } from '../services/email';

const app = new Hono<{ Bindings: Bindings }>();

// --- Register ---
app.post('/register', async (c) => {
  try {
    const { email, wallet_address, invite_code_used, avatar_url, name, bio } = await c.req.json()

    if (!email || !wallet_address || !invite_code_used) {
      return c.json({ error: 'Missing fields' }, 400)
    }

    let referrerId: string | null = null;
    let isSystemInvite = false;

    // Check User Code
    const referrerUser = await c.env.axis_db.prepare('SELECT id FROM users WHERE invite_code = ?').bind(invite_code_used).first();
    
    if (referrerUser) {
      // @ts-ignore
      referrerId = referrerUser.id;
    } else {
      // Check System Code
      const invite = await InviteModel.findInviteByCode(c.env.axis_db, invite_code_used);
      if (invite) {
        referrerId = (invite.creator_id === 'system') ? null : invite.creator_id;
        isSystemInvite = true;
      } else {
        return c.json({ error: 'Invalid invite code' }, 400)
      }
    }

    const existing = await c.env.axis_db.prepare('SELECT id, invite_code FROM users WHERE email = ? OR wallet_address = ?')
      .bind(email, wallet_address)
      .first()

    if (existing) {
       // @ts-ignore
      return c.json({ success: true, user: { id: existing.id, invite_code: existing.invite_code, is_existing: true } })
    }

    const newId = crypto.randomUUID()
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const newInviteCode = `AXIS-${randomSuffix}`

    await UserModel.createRegisteredUser(c.env.axis_db, newId, email, wallet_address, newInviteCode, invite_code_used, avatar_url, name, bio);

    if (isSystemInvite) {
      await InviteModel.markInviteUsed(c.env.axis_db, invite_code_used, newId);
    }

    try {
      await sendInviteEmail(c.env, email, newInviteCode);
    } catch (err) {
      console.error("Email send failed (non-fatal):", err);
    }

    return c.json({ 
      success: true, 
      user: { id: newId, invite_code: newInviteCode, is_existing: false } 
    })

  } catch (e: any) {
    console.error('Register Error:', e)
    return c.json({ error: e.message || 'Internal Server Error' }, 500)
  }
})

// --- Request Invite ---
app.post('/request-invite', async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) return c.json({ error: 'Email is required' }, 400);

    const existingUser = await UserModel.findUserByEmail(c.env.axis_db, email);
    if (existingUser) {
        return c.json({ error: 'User already registered' }, 409);
    }

    // ★修正: createOneInviteにemailを渡す
    const code = await InviteModel.createOneInvite(c.env.axis_db, 'system', email);

    try {
        await sendInviteEmail(c.env, email, code);
    } catch (emailError: any) {
        console.error('Send Email Error:', emailError);
        return c.json({ error: 'Failed to send invite email' }, 500);
    }

    return c.json({ success: true, message: 'Invite code sent' });

  } catch (e: any) {
    console.error('Request Invite Error:', e);
    return c.json({ error: e.message || 'Internal Server Error' }, 500);
  }
});

// --- Get User ---
app.get('/user', async (c) => { 
  const wallet = c.req.query('wallet');
  
  if (!wallet) return c.json({ error: 'Wallet address required' }, 400);

  try {
    const user = await UserModel.findUserByWallet(c.env.axis_db, wallet);
    if (!user) return c.json({}); 

    return c.json({
      username: user.name,
      bio: user.bio,
      pfpUrl: user.avatar_url,
      badges: user.badges ? JSON.parse(user.badges) : [],
      total_xp: user.total_xp || 500,
      rank_tier: user.rank_tier || 'Novice',
      last_checkin: user.last_checkin || 0
    });

  } catch (e: any) {
    console.error("Fetch User Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

// --- Update Profile ---
app.post('/user', async (c) => { 
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ success: false, error: 'Invalid JSON format' }, 400);
  }

  const { wallet_address, name, bio, avatar_url, badges } = body;

  if (!wallet_address) return c.json({ success: false, error: 'Wallet address is required' }, 400);
  
  try {
    const existing = await UserModel.findUserByWallet(c.env.axis_db, wallet_address);
    if (!existing) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    const badgesStr = Array.isArray(badges) ? JSON.stringify(badges) : (badges || null);

    await UserModel.updateUser(c.env.axis_db, wallet_address, { name, bio, avatar_url, badges: badgesStr });

    return c.json({ success: true, message: "Profile updated successfully" });

  } catch (e: any) {
    console.error("[DB Error]", e);
    return c.json({ success: false, error: 'Database operation failed' }, 500);
  }
});

// --- Daily Check-in ---
app.post('/users/:wallet/checkin', async (c) => {
    const wallet = c.req.param('wallet');
    try {
        const user = await UserModel.findUserByWallet(c.env.axis_db, wallet);
        if (!user) return c.json({ success: false, message: 'User not found' }, 404);

        const now = Math.floor(Date.now() / 1000);
        const lastCheckin = user.last_checkin || 0;
        
        if (now - lastCheckin < 20 * 60 * 60) { 
             return c.json({ success: false, message: 'Already checked in today' });
        }

        const newXp = (user.total_xp || 0) + 10;
        await UserModel.updateUserXp(c.env.axis_db, wallet, newXp, now);

        return c.json({ 
            success: true, 
            user: { ...user, total_xp: newXp, last_checkin: now } 
        });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

app.get('/my-invites', async (c) => { 
    const email = c.req.query('email');
    if(!email) return c.json([]);
    const user = await UserModel.findUserByEmail(c.env.axis_db, email);
    if(!user) return c.json([]);
    const invites = await InviteModel.findInvitesByCreator(c.env.axis_db, user.id);
    return c.json(invites);
});

export default app;