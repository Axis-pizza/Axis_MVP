/**
 * Kagemusha Routes - Strategy & Vault API
 * Refactored to use new modular services
 */

import { Hono } from 'hono';
import { Bindings } from '../config/env';
import { StrategyGenerator, TOKEN_UNIVERSE } from '../services/strategy';
import { PriceService } from '../services/price';
import { JitoBundleService } from '../services/blockchain';

const app = new Hono<{ Bindings: Bindings }>();

const priceService = new PriceService();

// Helper to create Jito service with env RPC URL
const createJitoService = (env: Bindings) => {
  return new JitoBundleService('devnet', 'tokyo', env.SOLANA_RPC_URL);
};

/**
 * POST /analyze - Generate AI-powered strategy suggestions
 */
app.post('/analyze', async (c) => {
  try {
    const { directive, tags, customInput } = await c.req.json();
    
    if (!directive) {
      return c.json({ success: false, error: 'Directive is required' }, 400);
    }

    const generator = new StrategyGenerator(c.env);
    const strategies = await generator.generateStrategies(directive, tags || [], customInput);
    
    return c.json({ 
      success: true, 
      strategies,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[Kagemusha] Analyze failed:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

let tokenCache: any[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 60秒間はキャッシュを使う

const generateFallbackChart = (basePrice: number, period: string, type: 'line' | 'candle') => {
  const days = period === '1d' ? 1 : (period === '30d' ? 30 : 7);
  // キャンドルは見やすさのためにデータ点を少なめにする
  const points = type === 'candle' ? 40 : 60; 
  const data = [];
  const now = Math.floor(Date.now() / 1000);
  const interval = (days * 24 * 3600) / points;

  let current = basePrice * 0.9; // スタート価格（少し安くしておく）

  for (let i = 0; i < points; i++) {
    const time = Math.floor(now - ((points - 1 - i) * interval));
    
    // ランダムウォークで変動を作る
    const change = 1 + (Math.random() * 0.05 - 0.025);
    const nextVal = current * change;

    if (type === 'candle') {
      // ★ここが重要: Candle要求なら必ず4本値を作る
      const open = current;
      const close = nextVal;
      // 高値・安値を矛盾しないように計算
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);
      
      data.push({ time, open, high, low, close });
    } else {
      // Line要求なら value のみ
      data.push({ time, value: current });
    }
    
    current = nextVal;
    // グラフの最後は現在の価格に収束させる（リアルに見せるため）
    if (i === points - 1) current = basePrice; 
  }
  return data;
};

/**
 * GET /tokens - Get curated token universe with real-time prices
 * (CoinGecko Proxy & Cache)
 */
app.get('/tokens', async (c) => {
  try {
    const now = Date.now();

    // 1. キャッシュが有効ならそれを返す (CoinGeckoを叩かない)
    if (tokenCache.length > 0 && (now - lastFetchTime < CACHE_DURATION)) {
      return c.json({ success: true, tokens: tokenCache, source: 'cache' });
    }

    // 2. CoinGeckoから取得
    console.log('Fetching from CoinGecko...');
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&order=market_cap_desc&per_page=50&page=1&sparkline=false',
      {
        headers: {
          'User-Agent': 'Axis-App/1.0' // User-Agentをつけるとブロックされにくい
        }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API Error: ${response.status}`);
    }

    const data: any[] = await response.json();

    // 3. データを整形 (Frontendが使いやすい形に)
    const formattedTokens = data.map((t: any) => ({
      symbol: t.symbol.toUpperCase(),
      name: t.name,
      address: t.id, // IDをアドレス代わりに
      price: t.current_price,
      change24h: t.price_change_percentage_24h,
      logoURI: t.image, // ここで画像URLを取得！
      marketCap: t.market_cap
    }));

    // 4. キャッシュ更新
    tokenCache = formattedTokens;
    lastFetchTime = now;

    return c.json({ 
      success: true, 
      tokens: formattedTokens,
      source: 'api'
    });

  } catch (error: any) {
    console.error('[Kagemusha] Token fetch failed:', error);
    
    // エラー時はキャッシュがあれば古くてもそれを返す
    if (tokenCache.length > 0) {
       return c.json({ success: true, tokens: tokenCache, source: 'stale-cache' });
    }

    // キャッシュもなければ、最低限のフォールバックデータを返す（アプリを壊さないため）
    return c.json({ 
      success: true, 
      tokens: [
        { symbol: 'SOL', price: 150, change24h: 0, logoURI: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
        { symbol: 'USDC', price: 1, change24h: 0, logoURI: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png' }
      ] 
    });
  }
});

/**
 * GET /tokens/search - Search tokens by symbol or name
 */
app.get('/tokens/search', async (c) => {
  try {
    const query = c.req.query('q') || '';
    const limit = parseInt(c.req.query('limit') || '20');
    
    const tokens = await priceService.searchTokens(query, limit);
    
    return c.json({ success: true, tokens });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /tokens/:address/history - Get price history for charts
 */
app.get('/tokens/:address/history', async (c) => {
  try {
    const address = c.req.param('address');
    const interval = (c.req.query('interval') as '1h' | '1d' | '1w') || '1d';
    
    const history = await priceService.getPriceHistory(address, interval);
    
    if (!history) {
      return c.json({ success: false, error: 'History not available' }, 404);
    }

    return c.json({ success: true, history });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});


/**
 * POST /deploy - Deploy strategy via Jito Bundle
 */
app.post('/deploy', async (c) => {
  try {
    // 1. リクエストボディをすべて取得
    const body = await c.req.json();
    
    // 2. 必要なデータを取り出し（フロントエンドの送信形式に合わせて調整）
    // フロントは "signedTransaction" または "signature" で送ってくる可能性がある
    const signedTransaction = body.signedTransaction || body.signature; 
    
    // メタデータが "metadata" キーに入っている場合と、フラットに入っている場合の両方に対応
    const metadata = body.metadata || body; 

    if (!signedTransaction) {
      return c.json({ success: false, error: 'Signed transaction required' }, 400);
    }

    // Create Jito service with env RPC URL
    const jitoService = createJitoService(c.env);

    // Send via Jito for MEV protection
    // (署名データがBase64の場合はデコードが必要な場合もありますが、JitoService側で処理していると仮定)
    let bundleId = null;
    try {
        // 配列にして渡す
        const result = await jitoService.sendBundle([signedTransaction]);
        bundleId = result.bundleId;
    } catch (e) {
        console.warn("Jito bundle failed, but proceeding to save:", e);
        // Jitoが失敗してもDB保存は試みるべき
    }

    // 3. データベースへの保存
    // フロントエンドが送ってくるキー名 (ownerPubkey, tokens) に対応させる
    const id = body.strategyId || body.id || crypto.randomUUID();
    
    if (c.env.axis_db) {
      console.log("Saving strategy to DB:", id); // ログ出し推奨

      const owner = metadata.ownerPubkey || metadata.creator || 'unknown';
      const config = JSON.stringify(metadata.tokens || metadata.composition || []);
      const isPublic = metadata.isPublic !== false ? 1 : 0; // デフォルトは公開(1)
      await addXP(c.env.axis_db, metadata.ownerPubkey, 500, 'STRATEGY_CREATION', 'Created new strategy');
      await c.env.axis_db.prepare(
        `INSERT INTO strategies (id, owner_pubkey, name, type, config, description, jito_bundle_id, is_public, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        owner,
        metadata.name || 'Untitled',
        metadata.type || 'BALANCED',
        config,
        metadata.description || '',
        bundleId || 'simulated', // バンドルIDがない場合のダミー
        isPublic,
        Math.floor(Date.now() / 1000) // created_at (秒) を追加
      ).run();
    }

    return c.json({ 
      success: true, 
      bundleId: bundleId,
      strategyId: id
    });
  } catch (error: any) {
    console.error('[Kagemusha] Deploy failed:', error);
    // ここでちゃんとエラーを返してあげる
    return c.json({ success: false, error: error.message }, 500);
  }
  
});

app.get('/strategies/:id/chart', async (c) => {
  // パラメータ取得
  const id = c.req.param('id');
  const period = c.req.query('period') || '7d';
  // typeが変な値で来ても壊れないように正規化
  const type = c.req.query('type') === 'candle' ? 'candle' : 'line';

  try {
    // 1. DBから戦略構成を取得
    const strategy = await c.env.axis_db.prepare(
      "SELECT config FROM strategies WHERE id = ?"
    ).bind(id).first();

    // 構成がない場合はSOL100%として扱う
    const tokens = strategy 
      ? JSON.parse(strategy.config as string) 
      : [{ symbol: 'SOL', weight: 100 }];

    // 2. CoinGecko IDマッピング
    const symbolToId: Record<string, string> = {
      'SOL': 'solana', 'USDC': 'usd-coin', 'BONK': 'bonk', 
      'JUP': 'jupiter-exchange-solana', 'JTO': 'jito-governance-token',
      'RENDER': 'render-token', 'WIF': 'dogwifcoin', 'RAY': 'raydium'
    };

    const days = period === '1d' ? 1 : (period === '30d' ? 30 : 7);
    
    // APIデータ取得ブロック
    try {
      // 全トークンの価格履歴を取得
      const historyPromises = tokens.map(async (t: any) => {
        const coingeckoId = symbolToId[t.symbol.toUpperCase()] || 'solana';
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=${days}`,
          { headers: { 'User-Agent': 'Axis-App/1.0' } }
        );
        if (!res.ok) throw new Error('Rate Limit or Error');
        const data = await res.json() as any;
        return { symbol: t.symbol, prices: data.prices || [] };
      });

      const histories = await Promise.all(historyPromises);
      const baseHistory = histories[0]?.prices || [];
      if (baseHistory.length === 0) throw new Error('Empty history');

      // 合成価格（NAV）の時系列データを作成
      const rawPoints = baseHistory.map((point: any, index: number) => {
        const timestamp = point[0]; 
        let nav = 0;
        tokens.forEach((t: any) => {
          const h = histories.find(h => h.symbol === t.symbol);
          // データ欠損対策: 同じindexがない場合は最後のデータを使う
          const pData = h?.prices[index] || h?.prices[h.prices.length - 1];
          const price = pData ? pData[1] : 0;
          nav += price * (t.weight / 100);
        });
        return { time: timestamp, value: nav };
      });

      // -------------------------------------------------
      //  Candle (OHLC) 生成ロジック
      // -------------------------------------------------
      if (type === 'candle') {
        let intervalMs = 3600 * 1000; // default 1h
        if (period === '1d') intervalMs = 15 * 60 * 1000; // 15min
        else if (period === '30d') intervalMs = 4 * 3600 * 1000; // 4h

        const ohlcData = [];
        if (rawPoints.length > 0) {
            let currentBucketStart = Math.floor(rawPoints[0].time / intervalMs) * intervalMs;
            let open = rawPoints[0].value;
            let high = rawPoints[0].value;
            let low = rawPoints[0].value;
            let close = rawPoints[0].value;

            for (const p of rawPoints) {
            if (p.time >= currentBucketStart + intervalMs) {
                ohlcData.push({
                time: Math.floor(currentBucketStart / 1000), 
                open, high, low, close
                });
                currentBucketStart = Math.floor(p.time / intervalMs) * intervalMs;
                open = close;
                high = p.value;
                low = p.value;
                close = p.value;
            } else {
                high = Math.max(high, p.value);
                low = Math.min(low, p.value);
                close = p.value;
            }
            }
            // 最後の足
            ohlcData.push({
                time: Math.floor(currentBucketStart / 1000),
                open, high, low, close
            });
        }

        // 正規化 (100スタート)
        const startVal = ohlcData[0]?.open || 1;
        const normalized = ohlcData.map(d => ({
          time: d.time,
          open: (d.open / startVal) * 100,
          high: (d.high / startVal) * 100,
          low: (d.low / startVal) * 100,
          close: (d.close / startVal) * 100
        }));

        return c.json({ success: true, data: normalized, type: 'candle' });
      }

      // -------------------------------------------------
      //  Line 生成ロジック
      // -------------------------------------------------
      const startVal = rawPoints[0]?.value || 1;
      const normalized = rawPoints.map(d => ({
        time: Math.floor(d.time / 1000),
        value: (d.value / startVal) * 100
      }));

      return c.json({ success: true, data: normalized, type: 'line' });

    } catch (apiError: any) {
      // ⚠️ ここが今まで足りていなかった部分 ⚠️
      // APIエラーが発生したら、エラーを返すのではなく「モックデータ」を生成して返す
      console.warn("Chart API failed (Rate Limit?), using fallback:", apiError.message);
      
      const mockData = generateFallbackChart(100, period as string, type);
      
      // note: 'simulated' を付けることで、フロント側で「これはシミュレーションです」と表示することも可能
      return c.json({ success: true, data: mockData, note: 'simulated', type });
    }

  } catch (error: any) {
    // 致命的なエラー時の最終防衛ライン
    console.error("Critical Chart Error:", error);
    const mockData = generateFallbackChart(100, '7d', type);
    return c.json({ success: true, data: mockData, error: error.message });
  }
});

/**
 * POST /strategies/:id/watchlist
 * Toggle Watchlist (Add/Remove)
 */
app.post('/strategies/:id/watchlist', async (c) => {
  try {
    const { userPubkey } = await c.req.json();
    const strategyId = c.req.param('id');
    const now = Math.floor(Date.now() / 1000);

    // 既に登録されているか確認
    const existing = await c.env.axis_db.prepare(
      "SELECT * FROM watchlist WHERE user_pubkey = ? AND strategy_id = ?"
    ).bind(userPubkey, strategyId).first();

    if (existing) {
      // 登録済みなら削除 (Remove)
      await c.env.axis_db.prepare(
        "DELETE FROM watchlist WHERE user_pubkey = ? AND strategy_id = ?"
      ).bind(userPubkey, strategyId).run();
      return c.json({ success: true, isWatchlisted: false });
    } else {
      // 未登録なら追加 (Add)
      await c.env.axis_db.prepare(
        "INSERT INTO watchlist (user_pubkey, strategy_id, created_at) VALUES (?, ?, ?)"
      ).bind(userPubkey, strategyId, now).run();
      return c.json({ success: true, isWatchlisted: true });
    }
  } catch (e) {
    return c.json({ success: false, error: 'DB Error' }, 500);
  }
});

// ---------------------------------------------------------
// 🧠 Helper: XP加算ロジック (紹介報酬 10% 自動付与)
// ---------------------------------------------------------
async function addXP(
  db: D1Database, 
  pubkey: string, 
  amount: number, 
  actionType: string, 
  description: string,
  relatedId: string | null = null
) {
  // 1. 本人に付与
  await db.prepare(
    `INSERT INTO xp_ledger (user_pubkey, amount, action_type, description, related_id) 
     VALUES (?, ?, ?, ?, ?)`
  ).bind(pubkey, amount, actionType, description, relatedId).run();

  // ユーザーの合計XPを更新
  await db.prepare(
    `UPDATE users SET total_xp = total_xp + ? WHERE pubkey = ?`
  ).bind(amount, pubkey).run();

  // 2. 紹介者ボーナス (再帰防止のため REFERRAL_BONUS 自体は対象外)
  if (actionType !== 'REFERRAL_BONUS') {
    const user = await db.prepare(
      "SELECT referrer_id FROM users WHERE pubkey = ?"
    ).bind(pubkey).first();

    if (user && user.referrer_id) {
      const bonus = amount * 0.1; // 10%
      if (bonus >= 0.1) { // 小さすぎる端数は無視
        console.log(`🎁 Referral Bonus: ${user.referrer_id} gets ${bonus} XP`);
        // 再帰呼び出し (紹介者の紹介者には連鎖させない仕様にするならここで止める)
        await addXP(
          db, 
          user.referrer_id as string, 
          bonus, 
          'REFERRAL_BONUS', 
          `Bonus from ${pubkey.slice(0,4)}...`, 
          pubkey
        );
      }
    }
  }
}

// ---------------------------------------------------------
// 👤 Routes
// ---------------------------------------------------------

// ユーザー取得 & 自動登録 & 招待紐付け
app.get('/users/:pubkey', async (c) => {
  const pubkey = c.req.param('pubkey');
  const refCode = c.req.query('ref'); // クエリパラメータ ?ref=xxx

  try {
    let user = await c.env.axis_db.prepare("SELECT * FROM users WHERE pubkey = ?").bind(pubkey).first();

    // 新規登録
    if (!user) {
      console.log(`🆕 New User: ${pubkey}`);
      let referrerId = null;

      // 招待コードの有効性チェック
      if (refCode && refCode !== pubkey) {
        const parent = await c.env.axis_db.prepare("SELECT pubkey FROM users WHERE pubkey = ?").bind(refCode).first();
        if (parent) {
          referrerId = refCode;
          console.log(`🔗 Linked to: ${referrerId}`);
        }
      }

      await c.env.axis_db.prepare(
        "INSERT INTO users (pubkey, total_xp, referrer_id) VALUES (?, 0, ?)"
      ).bind(pubkey, referrerId).run();

      // 初期ボーナス (招待された人は +100 XP スタートなど)
      if (referrerId) {
        await addXP(c.env.axis_db, pubkey, 100, 'REFERRAL_SIGNUP_BONUS', 'Welcome Bonus');
      }

      user = await c.env.axis_db.prepare("SELECT * FROM users WHERE pubkey = ?").bind(pubkey).first();
    }
    return c.json({ success: true, user });
  } catch (e: any) {
    return c.json({ success: false, error: e.message });
  }
});

// デイリーチェックイン (テスト用)
app.post('/users/:pubkey/checkin', async (c) => {
  const pubkey = c.req.param('pubkey');
  try {
    // 24時間以内のチェックインを確認
    const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
    const existing = await c.env.axis_db.prepare(
      "SELECT id FROM xp_ledger WHERE user_pubkey = ? AND action_type = 'DAILY_CHECKIN' AND created_at > ?"
    ).bind(pubkey, oneDayAgo).first();

    if (existing) return c.json({ success: false, message: 'Come back tomorrow!' });

    // 10 XP付与 (紹介者には自動で +1 XP)
    await addXP(c.env.axis_db, pubkey, 10, 'DAILY_CHECKIN', 'Daily Login');
    
    // 最新情報を返す
    const updated = await c.env.axis_db.prepare("SELECT * FROM users WHERE pubkey = ?").bind(pubkey).first();
    return c.json({ success: true, user: updated });
  } catch (e: any) {
    return c.json({ success: false, error: e.message });
  }
});

// リーダーボード取得 (TOP 50)
app.get('/leaderboard', async (c) => {
  try {
    const { results } = await c.env.axis_db.prepare(
      `SELECT pubkey, username, total_xp, rank_tier 
       FROM users 
       ORDER BY total_xp DESC 
       LIMIT 50`
    ).all();
    
    return c.json({ success: true, leaderboard: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message });
  }
});

/**
 * GET /strategies/:id/watchlist
 * Check status
 */
app.get('/strategies/:id/watchlist', async (c) => {
  const userPubkey = c.req.query('user');
  const strategyId = c.req.param('id');
  if (!userPubkey) return c.json({ isWatchlisted: false });

  const existing = await c.env.axis_db.prepare(
    "SELECT 1 FROM watchlist WHERE user_pubkey = ? AND strategy_id = ?"
  ).bind(userPubkey, strategyId).first();

  return c.json({ success: true, isWatchlisted: !!existing });
});


/**
 * GET /discover - Get all public strategies for discovery
 */
app.get('/discover', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    const results = await c.env.axis_db.prepare(
      `SELECT id, owner_pubkey, name, type, config, description, total_deposited, created_at 
       FROM strategies 
       WHERE is_public = 1 AND status = 'active'
       ORDER BY total_deposited DESC, created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(limit, offset).all();
    
    // Parse config JSON for each strategy
    const strategies = results.results.map((s: any) => ({
      id: s.id,
      ownerPubkey: s.owner_pubkey,
      name: s.name,
      type: s.type,
      tokens: s.config ? JSON.parse(s.config) : [],
      description: s.description || '',
      tvl: s.total_deposited || 0,
      createdAt: s.created_at,
    }));
    
    return c.json({ 
      success: true, 
      strategies,
      total: strategies.length,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[Kagemusha] Discover failed:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /strategies/:pubkey - Get user's deployed strategies
 */
app.get('/strategies/:pubkey', async (c) => {
  try {
    const pubkey = c.req.param('pubkey');
    
    const results = await c.env.axis_db.prepare(
      `SELECT id, owner_pubkey, name, type, config, description, total_deposited, status, created_at
       FROM strategies 
       WHERE owner_pubkey = ? 
       ORDER BY created_at DESC`
    ).bind(pubkey).all();
    
    const strategies = results.results.map((s: any) => ({
      id: s.id,
      ownerPubkey: s.owner_pubkey,
      name: s.name,
      type: s.type,
      tokens: s.config ? JSON.parse(s.config) : [],
      description: s.description || '',
      tvl: s.total_deposited || 0,
      status: s.status,
      createdAt: s.created_at,
    }));
    
    return c.json({ success: true, strategies });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /prepare-deployment - Get Jito tip account for transaction
 */
app.get('/prepare-deployment', async (c) => {
  try {
    const jitoService = createJitoService(c.env);
    const tipAccount = await jitoService.getRandomTipAccount();
    
    return c.json({
      success: true,
      tipAccount,
      minTipLamports: 1000,
      recommendedTipLamports: 10000,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;

