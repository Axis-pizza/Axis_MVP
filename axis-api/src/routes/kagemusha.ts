/**
 * Kagemusha Routes - Strategy & Vault API
 * Consolidated and Refactored
 */

import { Hono } from 'hono';
import { Bindings } from '../config/env';
import { StrategyGenerator } from '../services/strategy';
import { PriceService } from '../services/price';
import { JitoBundleService } from '../services/blockchain';

const app = new Hono<{ Bindings: Bindings }>();
const priceService = new PriceService();

// Helper to create Jito service
const createJitoService = (env: Bindings) => {
  return new JitoBundleService('devnet', 'tokyo', env.SOLANA_RPC_URL);
};

// -----------------------------------------------------------
// 🧠 AI Analysis & Token Data
// -----------------------------------------------------------

app.post('/analyze', async (c) => {
  try {
    const { directive, tags, customInput } = await c.req.json();
    if (!directive) return c.json({ success: false, error: 'Directive required' }, 400);

    const generator = new StrategyGenerator(c.env);
    const strategies = await generator.generateStrategies(directive, tags || [], customInput);
    
    return c.json({ success: true, strategies });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

let tokenCache: any[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; 

app.get('/tokens', async (c) => {
  try {
    const now = Date.now();
    if (tokenCache.length > 0 && (now - lastFetchTime < CACHE_DURATION)) {
      return c.json({ success: true, tokens: tokenCache, source: 'cache' });
    }

    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&order=market_cap_desc&per_page=50&page=1&sparkline=false',
      { headers: { 'User-Agent': 'Axis-App/1.0' } }
    );

    if (!response.ok) throw new Error('CoinGecko API Error');
    const data: any[] = await response.json();

    const formattedTokens = data.map((t: any) => ({
      symbol: t.symbol.toUpperCase(),
      name: t.name,
      address: t.id,
      price: t.current_price,
      change24h: t.price_change_percentage_24h,
      logoURI: t.image,
      marketCap: t.market_cap
    }));

    tokenCache = formattedTokens;
    lastFetchTime = now;

    return c.json({ success: true, tokens: formattedTokens, source: 'api' });
  } catch (error: any) {
    if (tokenCache.length > 0) return c.json({ success: true, tokens: tokenCache, source: 'stale' });
    return c.json({ success: true, tokens: [] });
  }
});

app.get('/tokens/search', async (c) => {
  const query = c.req.query('q') || '';
  const limit = parseInt(c.req.query('limit') || '20');
  const tokens = await priceService.searchTokens(query, limit);
  return c.json({ success: true, tokens });
});

app.get('/tokens/:address/history', async (c) => {
  try {
    const address = c.req.param('address');
    const interval = (c.req.query('interval') as '1h' | '1d' | '1w') || '1d';
    const history = await priceService.getPriceHistory(address, interval);
    if (!history) return c.json({ success: false, error: 'History not available' }, 404);
    return c.json({ success: true, history });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------
// 🚀 Strategy Management
// -----------------------------------------------------------

/**
 * POST /strategies - Manual Creation (Draft / DB Only)
 * ★注意: このエンドポイントはDraftのみ。最終保存は/deployで行う
 */
app.post('/strategies', async (c) => {
  try {
    const body = await c.req.json();
    const { owner_pubkey, name, ticker, description, type, tokens, config } = body;

    if (!owner_pubkey || !name || !tokens) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);

    // ★修正: 重複チェック - 同じowner + name + 60秒以内のものがあればスキップ
    const recentCheck = await c.env.axis_db.prepare(`
      SELECT id FROM strategies 
      WHERE owner_pubkey = ? AND name = ? AND created_at > ?
    `).bind(owner_pubkey, name, now - 60).first();
    
    if (recentCheck) {
      console.log('[Strategies] Duplicate detected, returning existing');
      return c.json({ success: true, strategy_id: recentCheck.id, duplicate: true });
    }

    const id = crypto.randomUUID();

    // DB Insert
    const result = await c.env.axis_db.prepare(`
      INSERT INTO strategies (
        id, owner_pubkey, name, ticker, description, type, 
        composition, config, status, created_at, tvl, roi, total_deposited
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 0, 0, 0)
    `).bind(
      id,
      owner_pubkey,
      name,
      ticker || '',
      description || '',
      type || 'MANUAL',
      JSON.stringify(tokens),
      JSON.stringify(config || {}),
      now
    ).run();

    if (!result.success) throw new Error('DB Insert Failed');

    // XP
    await addXP(c.env.axis_db, owner_pubkey, 100, 'STRATEGY_DRAFT', 'Drafted new strategy');

    return c.json({ success: true, strategy_id: id });
  } catch (e: any) {
    console.error('Create Strategy Error:', e);
    return c.json({ success: false, error: e.message }, 500);
  }
});

/**
 * POST /deploy - Deploy via Jito (On-chain Transaction)
 * ★修正: TVL保存 + 重複防止ロジック追加
 */
app.post('/deploy', async (c) => {
  try {
    const body = await c.req.json();
    const signedTransaction = body.signedTransaction || body.signature; 
    const metadata = body.metadata || body; 

    if (!signedTransaction) return c.json({ success: false, error: 'Signature required' }, 400);

    // Jito送信（失敗しても続行）
    const jitoService = createJitoService(c.env);
    let bundleId = null;
    try {
        const result = await jitoService.sendBundle([signedTransaction]);
        bundleId = result.bundleId;
    } catch (e) {
        console.warn("Jito bundle skipped/failed:", e);
    }

    // メタデータ抽出
    const owner = metadata.ownerPubkey || metadata.creator || 'unknown';
    const name = metadata.name || 'Untitled';
    const ticker = metadata.ticker || '';
    const strategyType = metadata.type || 'BALANCED';
    const tokens = metadata.tokens || metadata.composition || [];
    const config = metadata.config || {};
    const description = metadata.description || '';
    
    // ★重要: TVL/initialInvestmentを取得
    const depositAmount = metadata.tvl || metadata.initialInvestment || 0;
    
    console.log(`[Deploy] Owner: ${owner}, Name: ${name}, TVL: ${depositAmount}`);
    
    if (c.env.axis_db) {
      const now = Math.floor(Date.now() / 1000);
      
      // ★修正: 重複チェック - 同じowner + name + tokens構成 + 60秒以内
      const tokensKey = JSON.stringify(tokens.map((t: any) => ({ s: t.symbol, w: t.weight })).sort((a: any, b: any) => a.s.localeCompare(b.s)));
      
      const recentCheck = await c.env.axis_db.prepare(`
        SELECT id, total_deposited, tvl FROM strategies 
        WHERE owner_pubkey = ? AND name = ? AND created_at > ?
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(owner, name, now - 120).first();
      
      if (recentCheck) {
        console.log(`[Deploy] Found recent strategy ${recentCheck.id}, updating TVL`);
        
        // 既存レコードを更新（TVLを設定）
        const newTvl = depositAmount;
        const newTotalDeposited = (recentCheck.total_deposited as number || 0) + depositAmount;
        
        await c.env.axis_db.prepare(`
          UPDATE strategies
          SET tvl = ?,
              total_deposited = ?,
              jito_bundle_id = ?,
              ticker = COALESCE(NULLIF(?, ''), ticker),
              status = 'active'
          WHERE id = ?
        `).bind(newTvl, newTotalDeposited, bundleId || 'simulated', ticker, recentCheck.id).run();
        
        // デプロイXP（更新時も付与）
        await addXP(c.env.axis_db, owner, 500, 'STRATEGY_DEPLOY', 'Deployed on-chain strategy');
        
        return c.json({ 
          success: true, 
          bundleId, 
          strategyId: recentCheck.id, 
          updated: true,
          tvl: newTvl
        });
      }
      
      // 新規INSERT
      const id = body.strategyId || crypto.randomUUID();
      
      await c.env.axis_db.prepare(`
        INSERT INTO strategies (
          id, owner_pubkey, name, ticker, type, composition, config, description,
          jito_bundle_id, status, created_at, tvl, total_deposited, roi
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, 0)
      `).bind(
        id,
        owner,
        name,
        ticker,
        strategyType,
        JSON.stringify(tokens),
        JSON.stringify(config),
        description,
        bundleId || 'simulated',
        now,
        depositAmount,
        depositAmount
      ).run();

      await addXP(c.env.axis_db, owner, 500, 'STRATEGY_DEPLOY', 'Deployed on-chain strategy');
      
      console.log(`[Deploy] Created new strategy ${id} with TVL ${depositAmount}`);
      
      return c.json({ 
        success: true, 
        bundleId, 
        strategyId: id,
        tvl: depositAmount
      });
    }

    return c.json({ success: true, bundleId });
  } catch (error: any) {
    console.error('[Deploy] Error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /strategies/:pubkey - Get user's strategies
 */
app.get('/strategies/:pubkey', async (c) => {
  try {
    const pubkey = c.req.param('pubkey');
    const { results } = await c.env.axis_db.prepare(
      `SELECT * FROM strategies WHERE owner_pubkey = ? ORDER BY created_at DESC`
    ).bind(pubkey).all();
    
    const strategies = results.map((s: any) => ({
      id: s.id,
      ownerPubkey: s.owner_pubkey,
      name: s.name,
      ticker: s.ticker,
      type: s.type,
      tokens: s.composition ? JSON.parse(s.composition) : (s.config ? JSON.parse(s.config) : []),
      config: s.config ? JSON.parse(s.config) : {},
      description: s.description || '',
      // ★修正: tvl と total_deposited の両方を返す
      tvl: s.tvl || s.total_deposited || 0,
      totalDeposited: s.total_deposited || 0,
      status: s.status,
      createdAt: s.created_at,
    }));
    
    return c.json({ success: true, strategies });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

/**
 * GET /discover - Public strategies
 */
app.get('/discover', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    const { results } = await c.env.axis_db.prepare(
      `SELECT * FROM strategies 
       WHERE status = 'active' 
       ORDER BY tvl DESC, total_deposited DESC, created_at DESC 
       LIMIT ? OFFSET ?`
    ).bind(limit, offset).all();
    
    const strategies = results.map((s: any) => ({
      id: s.id,
      ownerPubkey: s.owner_pubkey,
      name: s.name,
      ticker: s.ticker,
      tokens: s.composition ? JSON.parse(s.composition) : (s.config ? JSON.parse(s.config) : []),
      config: s.config ? JSON.parse(s.config) : {},
      tvl: s.tvl || s.total_deposited || 0,
      createdAt: s.created_at,
    }));
    
    return c.json({ success: true, strategies });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// -----------------------------------------------------------
// 📊 Charts & Helpers
// -----------------------------------------------------------

app.get('/strategies/:id/chart', async (c) => {
  const type = c.req.query('type') === 'candle' ? 'candle' : 'line';
  const period = c.req.query('period') || '7d';
  
  // 簡易モックチャート (本来はDBのsnapshotから取得)
  const data = [];
  const now = Math.floor(Date.now() / 1000);
  let val = 100;
  
  for(let i=0; i<30; i++) {
    val = val * (1 + (Math.random() * 0.1 - 0.04));
    data.push(type === 'line' 
      ? { time: now - (29-i)*86400, value: val }
      : { time: now - (29-i)*86400, open: val, high: val*1.02, low: val*0.98, close: val*1.01 }
    );
  }
  return c.json({ success: true, data, type });
});

app.get('/prepare-deployment', async (c) => {
  const jitoService = createJitoService(c.env);
  const tipAccount = await jitoService.getRandomTipAccount();
  return c.json({ success: true, tipAccount });
});

// ---------------------------------------------------------
// 🧠 XP Helper
// ---------------------------------------------------------
async function addXP(
  db: D1Database, 
  pubkey: string, 
  amount: number, 
  actionType: string, 
  description: string
) {
  try {
    await db.prepare(
      `INSERT INTO xp_ledger (user_pubkey, amount, action_type, description) VALUES (?, ?, ?, ?)`
    ).bind(pubkey, amount, actionType, description).run();
    await db.prepare(
      `UPDATE users SET total_xp = total_xp + ? WHERE pubkey = ?`
    ).bind(amount, pubkey).run();
  } catch(e) { /* ignore */ }
}

export default app;