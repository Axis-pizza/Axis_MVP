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
    // email, invite_code_used を任意項目として受け取る
    const { email, wallet_address, invite_code_used, avatar_url, name, bio } = await c.req.json()

    // ★変更点1: wallet_address のみ必須とする
    if (!wallet_address) {
      return c.json({ error: 'Wallet address is required' }, 400)
    }

    let referrerId: string | null = null;
    let isSystemInvite = false;

    // ★変更点2: 招待コードが入力されている場合のみチェックを実行
    if (invite_code_used) {
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
            // コードが入力されたのに無効な場合はエラーを返す（UXのため）
            // ※もし「無効なら無視して登録」にしたい場合はここをスルーさせてください
            return c.json({ error: 'Invalid invite code' }, 400)
          }
        }
    }

    // ★変更点3: 既存ユーザーチェック (Wallet優先、Emailがあればそれもチェック)
    let query = 'SELECT id, invite_code FROM users WHERE wallet_address = ?';
    let params: any[] = [wallet_address];

    if (email) {
        query += ' OR email = ?';
        params.push(email);
    }

    const existing = await c.env.axis_db.prepare(query)
      .bind(...params)
      .first()

    if (existing) {
       // @ts-ignore
      return c.json({ success: true, user: { id: existing.id, invite_code: existing.invite_code, is_existing: true } })
    }

    const newId = crypto.randomUUID()
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const newInviteCode = `AXIS-${randomSuffix}`

    // ★変更点4: Emailや招待コードがない場合は null を渡して登録
    // (注意: DBのusersテーブルで email, invite_code_used カラムが NULL許容になっている必要があります)
    await UserModel.createRegisteredUser(
        c.env.axis_db, 
        newId, 
        email || null, 
        wallet_address, 
        newInviteCode, 
        invite_code_used || null, 
        avatar_url, 
        name, 
        bio
    );

    if (isSystemInvite && invite_code_used) {
      await InviteModel.markInviteUsed(c.env.axis_db, invite_code_used, newId);
    }

    // ★変更点5: Emailがある場合のみ送信
    if (email) {
        try {
          await sendInviteEmail(c.env, email, newInviteCode);
        } catch (err) {
          console.error("Email send failed (non-fatal):", err);
        }
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
// (ここは変更なし。招待制を残すならこのままでOK)
app.post('/request-invite', async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) return c.json({ error: 'Email is required' }, 400);

    const existingUser = await UserModel.findUserByEmail(c.env.axis_db, email);
    if (existingUser) {
        return c.json({ error: 'User already registered' }, 409);
    }

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

app.get('/user', async (c) => { 
  const wallet = c.req.query('wallet');

  if (!wallet) return c.json({ error: 'Wallet address required' }, 400);

  try {
    const user = await UserModel.findUserByWallet(c.env.axis_db, wallet);

    // ★修正: クラッシュ防止の安全策
    let isVip = false;
    
    // whitelist_db が存在するかチェックしてから使う
    if (c.env.whitelist_db) {
      const whitelistEntry = await c.env.whitelist_db
        .prepare('SELECT 1 FROM users WHERE wallet_address = ?')
        .bind(wallet)
        .first();
      isVip = !!whitelistEntry;
    } else {
      // 存在しない場合はログだけ出して、処理は続行する（エラーにしない）
      console.error('⚠️ [WARNING] whitelist_db binding is MISSING. VIP check skipped.');
    }

    const userData = user || {
      name: 'Anonymous',
      bio: '',
      avatar_url: '',
      total_xp: 0,          
      rank_tier: 'Novice',  
      pnl_percent: 0,       
      total_invested_usd: 0
    };

    return c.json({
      success: true,
      user: {
        username: userData.name,
        bio: userData.bio,
        pfpUrl: userData.avatar_url,
        total_xp: userData.total_xp,
        rank_tier: userData.rank_tier,
        pnl_percent: userData.pnl_percent,
        total_invested: userData.total_invested_usd,
        is_vip: isVip // VIP判定結果
      }
    });

  } catch (e: any) {
    console.error("Fetch User Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

app.get('/users/:wallet/watchlist', async (c) => {
  const wallet = c.req.param('wallet');

  try {
    const user = await c.env.axis_db.prepare('SELECT id FROM users WHERE wallet_address = ?').bind(wallet).first();
    
    if (!user) {
      return c.json({ success: true, strategies: [] });
    }

    const query = `
      SELECT s.* FROM strategies s
      JOIN watchlist w ON s.id = w.strategy_id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `;

    const { results } = await c.env.axis_db.prepare(query).bind(user.id).all();

    return c.json({ success: true, strategies: results });

  } catch (e: any) {
    console.error("Get Watchlist Error:", e);
    return c.json({ success: false, strategies: [], error: e.message });
  }
});

app.post('/strategies/:id/watchlist', async (c) => {
  const strategyId = c.req.param('id');
  const { userPubkey } = await c.req.json();

  if (!userPubkey || !strategyId) {
    return c.json({ error: 'Missing params' }, 400);
  }

  try {
    let user = await c.env.axis_db.prepare('SELECT id FROM users WHERE wallet_address = ?').bind(userPubkey).first();
    if (!user) {
      const newId = crypto.randomUUID();
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      try {
        await c.env.axis_db.prepare(
          'INSERT INTO users (id, wallet_address, invite_code, total_xp, rank_tier, last_checkin) VALUES (?, ?, ?, 0, "Novice", 0)'
        ).bind(newId, userPubkey, inviteCode).run();
        user = { id: newId };
      } catch (err) {
        user = await c.env.axis_db.prepare('SELECT id FROM users WHERE wallet_address = ?').bind(userPubkey).first();
        if (!user) return c.json({ error: 'Failed to create user' }, 500);
      }
    }

    const existing = await c.env.axis_db.prepare(
      'SELECT id FROM watchlist WHERE user_id = ? AND strategy_id = ?'
    ).bind(user.id, strategyId).first();

    if (existing) {
      await c.env.axis_db.prepare(
        'DELETE FROM watchlist WHERE user_id = ? AND strategy_id = ?'
      ).bind(user.id, strategyId).run();
      return c.json({ success: true, isWatchlisted: false, message: 'Removed from watchlist' });
    } else {
      await c.env.axis_db.prepare(
        'INSERT INTO watchlist (id, user_id, strategy_id, created_at) VALUES (?, ?, ?, ?)'
      ).bind(crypto.randomUUID(), user.id, strategyId, Math.floor(Date.now() / 1000)).run();
      return c.json({ success: true, isWatchlisted: true, message: 'Added to watchlist' });
    }

  } catch (e: any) {
    console.error("Toggle Watchlist Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

app.get('/strategies/:id/watchlist', async (c) => {
  const strategyId = c.req.param('id');
  const userWallet = c.req.query('user');

  if (!userWallet) return c.json({ isWatchlisted: false });

  try {
    const user = await c.env.axis_db.prepare('SELECT id FROM users WHERE wallet_address = ?').bind(userWallet).first();
    if (!user) return c.json({ isWatchlisted: false });

    const existing = await c.env.axis_db.prepare(
      'SELECT id FROM watchlist WHERE user_id = ? AND strategy_id = ?'
    ).bind(user.id, strategyId).first();

    return c.json({ isWatchlisted: !!existing });
  } catch (e) {
    return c.json({ isWatchlisted: false });
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

  if (!wallet_address) return c.json({ success: false, error: 'Wallet address is required' }, 400);

  try {
    const existing = await UserModel.findUserByWallet(c.env.axis_db, wallet_address);

    if (!existing) {
      const id = crypto.randomUUID();
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await UserModel.createRegisteredUser(
        c.env.axis_db,
        id,
        '',
        wallet_address,
        inviteCode,
        '',
        avatar_url,
        name,
        bio
      );
      return c.json({ success: true, message: "Profile created successfully" });
    }

    const badgesStr = Array.isArray(badges) ? JSON.stringify(badges) : (badges || null);

    await UserModel.updateUser(c.env.axis_db, wallet_address, { name, bio, avatar_url, badges: badgesStr });

    return c.json({ success: true, message: "Profile updated successfully" });

  } catch (e: any) {
    console.error("[DB Error]", e);
    return c.json({ success: false, error: 'Database operation failed' }, 500);
  }
});

app.post('/users/:wallet/checkin', async (c) => {
  const wallet = c.req.param('wallet');
  try {
      const user = await UserModel.findUserByWallet(c.env.axis_db, wallet);
      if (!user) return c.json({ success: false, message: 'User not found' }, 404);

      const now = Math.floor(Date.now() / 1000);
      const lastCheckin = user.last_checkin || 0;
      
      // 20時間チェック (テスト時は短くしてもOK)
      if (now - lastCheckin < 20 * 60 * 60) { 
           return c.json({ success: false, message: 'Already checked in today' });
      }

      // ★追加: VIP判定とポイント倍率の適用
      const whitelistEntry = await c.env.whitelist_db
          .prepare('SELECT 1 FROM users WHERE wallet_address = ?')
          .bind(wallet)
          .first();
      const isVip = !!whitelistEntry;

      const basePoints = 10;
      // VIPなら1.5倍 (端数切り捨て)
      const earnedPoints = isVip ? Math.floor(basePoints * 1.5) : basePoints;

      // ★変更: 固定の10ではなく計算した earnedPoints を足す
      const newXp = (user.total_xp || 0) + earnedPoints;
      
      await UserModel.updateUserXp(c.env.axis_db, wallet, newXp, now);

      return c.json({ 
          success: true, 
          user: { ...user, total_xp: newXp, last_checkin: now },
          earnedPoints, // フロント表示用に獲得ポイントも返すと親切
          isVip         // フロント演出用に判定結果も返す
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


app.get('/leaderboard', async (c) => {
  try {
    const sort = c.req.query('sort') || 'points'; 
    const limit = 50;

    let orderBy = 'total_xp DESC';
    let valueColumn = 'total_xp';

    if (sort === 'volume') {
      orderBy = 'total_invested_usd DESC';
      valueColumn = 'total_invested_usd';
    } else if (sort === 'created') {
      orderBy = 'strategies_count DESC';
      valueColumn = 'strategies_count';
    }

    const query = `
      SELECT wallet_address, name, avatar_url, rank_tier, ${valueColumn} as value
      FROM users 
      ORDER BY ${orderBy} 
      LIMIT ?
    `;

    const { results } = await c.env.axis_db.prepare(query).bind(limit).all();

    return c.json({ 
      success: true, 
      leaderboard: results.map((u: any) => ({
        pubkey: u.wallet_address,
        username: u.name || 'Anonymous',
        avatar_url: u.avatar_url,
        rank_tier: u.rank_tier,
        value: u.value || 0
      }))
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.post('/user/stats', async (c) => {
  try {
    const { wallet_address, pnl_percent, total_invested_usd, strategy_id } = await c.req.json();

    if (!wallet_address) return c.json({ error: 'Wallet required' }, 400);

    // a) ユーザー全体の合計額を更新（加算するように修正）
    await c.env.axis_db.prepare(
      `UPDATE users SET total_invested_usd = total_invested_usd + ?, last_snapshot_at = ? WHERE wallet_address = ?`
    ).bind(total_invested_usd || 0, Math.floor(Date.now() / 1000), wallet_address).run();

    // b) 個別の投資履歴を記録 (strategy_id が送られてきた場合)
    if (strategy_id) {
      const user = await c.env.axis_db.prepare('SELECT id FROM users WHERE wallet_address = ?').bind(wallet_address).first();
      if (user) {
        // すでに投資済みなら金額を加算、なければ新規挿入 (UPSERT)
        const invId = crypto.randomUUID();
        await c.env.axis_db.prepare(`
          INSERT INTO investments (id, user_id, strategy_id, amount_usd)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, strategy_id) DO UPDATE SET amount_usd = amount_usd + ?
        `).bind(invId, user.id, strategy_id, total_invested_usd, total_invested_usd).run();
      }
    }

    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// --- 2. 投資済みETFリストの取得 (新規追加) ---
app.get('/users/:wallet/invested', async (c) => {
  const wallet = c.req.param('wallet');

  try {
    const user = await c.env.axis_db.prepare('SELECT id FROM users WHERE wallet_address = ?').bind(wallet).first();
    if (!user) return c.json({ success: true, strategies: [] });

    // investmentsテーブルとstrategiesテーブルをJOINして取得
    const query = `
      SELECT s.* FROM strategies s
      JOIN investments i ON s.id = i.strategy_id
      WHERE i.user_id = ?
      ORDER BY i.created_at DESC
    `;

    const { results } = await c.env.axis_db.prepare(query).bind(user.id).all();
    return c.json({ success: true, strategies: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message });
  }
});

export default app;