import { Hono } from 'hono';
import { Bindings } from '../config/env';
import * as UserModel from '../models/user';
import * as InviteModel from '../models/invite';
import { HTTPException } from 'hono/http-exception';

const app = new Hono<{ Bindings: Bindings }>();

app.post('/register', async (c) => {
  try {
    const { email, wallet_address, invite_code_used } = await c.req.json()

    if (!email || !wallet_address || !invite_code_used) {
      return c.json({ error: 'Missing fields' }, 400)
    }

    const referrerUser = await c.env.axis_db.prepare('SELECT id FROM users WHERE invite_code = ?').bind(invite_code_used).first();

    if (!referrerUser) {
      return c.json({ error: 'Invalid invite code' }, 400)
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


app.get('/my-invites', async (c) => { 
    const email = c.req.query('email');
    if(!email) return c.json([]);
  
    const user = await UserModel.findUserByEmail(c.env.axis_db, email);
    if(!user) return c.json([]);
  
    const invites = await InviteModel.findInvitesByCreator(c.env.axis_db, user.id);
    return c.json(invites);
});

export default app;
