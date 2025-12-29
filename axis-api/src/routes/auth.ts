import { Hono } from 'hono';
import { Bindings } from '../config/env';
import * as TwitterService from '../services/twitter';
import * as AuthService from '../services/auth';
import * as UserModel from '../models/user';

const app = new Hono<{ Bindings: Bindings }>();

app.get('/twitter', TwitterService.createTwitterAuth);
app.get('/twitter/callback', TwitterService.handleTwitterCallback);

app.post('/social-login', async (c) => {
  try {
    const { provider, email, wallet_address } = await c.req.json();
    
    if (!provider) return c.json({ error: "Provider required" }, 400);

    let user: UserModel.User | null = null;

    if (provider === 'solana' && wallet_address) {
      user = await UserModel.findUserByWallet(c.env.axis_db, wallet_address);
    } 
    else if ((provider === 'google' || provider === 'twitter') && email) {
      user = await UserModel.findUserByEmail(c.env.axis_db, email);
    }

    if (user) {
      if (provider === 'solana' && !user.wallet_address && wallet_address) {
          await UserModel.updateUserWallet(c.env.axis_db, user.id, wallet_address);
          user.wallet_address = wallet_address;
      }
      return c.json({ success: true, isNew: false, user });
    }

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

app.post('/store-otp', async (c) => {
  const { email, code } = await c.req.json();
  const expires = Math.floor(Date.now() / 1000) + 600; 
  
  const existing = await UserModel.findUserByEmail(c.env.axis_db, email);
  
  if (existing) {
    await UserModel.updateUserOtp(c.env.axis_db, email, code, expires);
  } else {
    const id = crypto.randomUUID();
    await UserModel.createOtpUser(c.env.axis_db, id, email, code, expires);
  }

  return c.json({ success: true });
});

app.post('/verify-otp', async (c) => {
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

export default app;
