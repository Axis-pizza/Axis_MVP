import { Hono } from 'hono';
import { Bindings } from '../config/env';
import * as TwitterService from '../services/twitter';
import * as AuthService from '../services/auth';
import * as UserModel from '../models/user';
// ★追加: InviteModelをインポート
import * as InviteModel from '../models/invite';

const app = new Hono<{ Bindings: Bindings }>();

app.get('/twitter', TwitterService.createTwitterAuth);
app.get('/twitter/callback', TwitterService.handleTwitterCallback);

// ★追加: 招待コード確認用エンドポイント
app.get('/check-invite', async (c) => {
  const code = c.req.query('code');
  if (!code) return c.json({ valid: false, message: "Code required" }, 400);

  const invite = await InviteModel.findInviteByCode(c.env.axis_db, code);
  
  if (!invite) {
    return c.json({ valid: false, message: "Invalid or used code" }, 404);
  }
  
  return c.json({ valid: true });
});

app.post('/social-login', async (c) => {
  try {
    // ★修正: inviteCode を受け取る
    const { provider, email, wallet_address, inviteCode } = await c.req.json();
    
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

    // ★追加: 新規ユーザー登録フロー
    // 招待コードのバリデーション (API側でも再確認)
    if (inviteCode) {
        const invite = await InviteModel.findInviteByCode(c.env.axis_db, inviteCode);
        if (!invite) return c.json({ error: "Invalid invite code" }, 400);
    }

    const newId = crypto.randomUUID();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newInviteCode = `AXIS-${randomSuffix}`;

    await UserModel.createSocialUser(c.env.axis_db, newId, email || null, wallet_address || null, newInviteCode);

    // ★追加: 招待コード処理: 使用済みにし、ユーザーに使用記録をつける
    if (inviteCode) {
        await InviteModel.markInviteUsed(c.env.axis_db, inviteCode, newId);
        // UserModelにメソッドがない可能性があるため、直接SQLで更新
        await c.env.axis_db.prepare("UPDATE users SET invite_code_used = ? WHERE id = ?")
            .bind(inviteCode, newId).run();
    }

    // ★追加: 新規ユーザーに招待枠(10個)を付与
    await InviteModel.createInvites(c.env.axis_db, newId, 10);

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