import { Hono } from 'hono';
import { Bindings } from '../config/env';
import * as UserModel from '../models/user';
import * as InviteModel from '../models/invite';
import { sendInviteEmail } from '../services/email';

const app = new Hono<{ Bindings: Bindings }>();

app.post('/request-invite', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})); 
    const { email } = body;

    // email が undefined/null/空文字 ならエラーを返す
    if (!email) return c.json({ error: 'Email is required' }, 400);

    const existingUser = await UserModel.findUserByEmail(c.env.axis_db, email);
    if (existingUser) {
        return c.json({ success: true, message: 'Invite code sent (if account available)' });
    }

    // ★重要: ここで email を渡す！ (これが抜けていた原因です)
    const code = await InviteModel.createOneInvite(c.env.axis_db, 'system', email);

    if (c.env.EMAIL) {
      c.executionCtx.waitUntil(sendInviteEmail(c.env, email, code).catch(e => console.error(e)));
    }

    return c.json({ success: true, message: 'Invite code sent' });

  } catch (e: any) {
    console.error('Request Invite Error:', e);
    return c.json({ error: e.message || 'Internal Server Error' }, 500);
  }
});

app.post('/register', async (c) => {
  try {
    const { email, wallet_address, invite_code_used, avatar_url, name, bio } = await c.req.json();

    if (!email || !wallet_address || !invite_code_used) {
      return c.json({ error: 'Missing fields' }, 400);
    }

    const invite = await InviteModel.findInviteByCode(c.env.axis_db, invite_code_used);
    const isDev = invite_code_used === 'AXIS-DEV';

    if (!invite && !isDev) {
      return c.json({ error: 'Invalid invite code' }, 400);
    }

    const existing = await UserModel.findUserByWallet(c.env.axis_db, wallet_address);
    if (existing) {
      return c.json({ success: true, user: existing });
    }

    const newId = crypto.randomUUID();
    // 自分の招待コード発行時も email が必要
    const newInviteCode = await InviteModel.createOneInvite(c.env.axis_db, newId, email);

    await UserModel.createRegisteredUser(
      c.env.axis_db, newId, email, wallet_address, newInviteCode, invite_code_used, avatar_url, name, bio
    );

    if (!isDev) {
      await InviteModel.markInviteUsed(c.env.axis_db, invite_code_used, newId);
    }

    if (c.env.EMAIL) {
      c.executionCtx.waitUntil(sendInviteEmail(c.env, email, newInviteCode));
    }

    return c.json({ success: true, user: { pubkey: wallet_address, total_xp: 500 } });

  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default app;