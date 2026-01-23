import { Buffer } from 'node:buffer';
globalThis.Buffer = Buffer;
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { Bindings } from './config/env';

import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import vaultRoutes from './routes/vault';
import miscRoutes from './routes/misc';
import kagemushaRoutes from './routes/kagemusha';
import uploadRoutes from './routes/upload';

const app = new Hono<{ Bindings: Bindings }>()

// --- Middleware ---
app.use('/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'DELETE'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}))

app.onError((err, c) => {
  console.error(`[Global Error] ${err.message}`, err);
  if (err instanceof HTTPException) {
    return c.json({ success: false, error: err.message }, err.status);
  }
  return c.json({ success: false, error: 'Internal Server Error' }, 500);
});

// --- Mount Routes ---
app.route('/auth', authRoutes);
app.route('/', userRoutes);
app.route('/', vaultRoutes);
app.route('/', miscRoutes);
app.route('/kagemusha', kagemushaRoutes);
app.route('/upload', uploadRoutes);


// --- ★重要: ここで Export の形を変えます ---

export default {
  // 1. HTTPリクエストハンドラ (通常のAPI)
  fetch: app.fetch,

  // 2. スケジュールイベントハンドラ (Cron Job)
  // wrangler.toml の [triggers] crons = ["0 * * * *"] で起動します
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    console.log("⏰ Cron Job Started: Snapshotting Strategies...");
    ctx.waitUntil(snapshotAllStrategies(env));
  }
};


// --- Helper Function: 全戦略の価格を保存するロジック ---
async function snapshotAllStrategies(env: Bindings) {
  try {
    const now = Math.floor(Date.now() / 1000);

    // 1. 全戦略を取得
    const { results: strategies } = await env.axis_db.prepare(
      "SELECT id, config FROM strategies"
    ).all();

    if (!strategies || strategies.length === 0) {
      console.log("No strategies to snapshot.");
      return;
    }

    // 2. 全トークンのシンボルを抽出
    const allSymbols = new Set<string>();
    strategies.forEach((s: any) => {
      try {
        const tokens = JSON.parse(s.config);
        tokens.forEach((t: any) => allSymbols.add(t.symbol.toUpperCase()));
      } catch (e) { /* ignore */ }
    });

    // 3. CoinGecko IDマッピング (主要通貨)
    const symbolToId: Record<string, string> = {
      'SOL': 'solana', 'USDC': 'usd-coin', 'BONK': 'bonk', 
      'JUP': 'jupiter-exchange-solana', 'JTO': 'jito-governance-token',
      'RENDER': 'render-token', 'WIF': 'dogwifcoin', 'RAY': 'raydium'
    };
    
    // IDリスト作成
    const ids = Array.from(allSymbols)
      .map(sym => symbolToId[sym] || 'solana') // 未知のものはSOLにフォールバック
      .join(',');

    // 4. CoinGeckoから一括価格取得
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`,
      { headers: { 'User-Agent': 'Axis-Indexer/1.0' } }
    );
    
    // エラーハンドリング (失敗しても止まらないように)
    let priceMap: Record<string, number> = {};
    
    if (res.ok) {
      const pricesData: any[] = await res.json();
      pricesData.forEach(p => {
        // IDからシンボルを逆引き、またはシンボルをそのまま使う
        const sym = Object.keys(symbolToId).find(key => symbolToId[key] === p.id) || p.symbol.toUpperCase();
        priceMap[sym] = p.current_price;
      });
    } else {
      console.warn("Snapshot: Price fetch failed, using fallback.");
    }
    
    // 最低限の価格保証
    priceMap['SOL'] = priceMap['SOL'] || 145;
    priceMap['USDC'] = priceMap['USDC'] || 1;

    // 5. 各戦略のNAV計算 & 保存
    const statements = [];
    
    for (const strat of strategies) {
      try {
        const tokens = JSON.parse(strat.config as string);
        let currentNav = 0;
        
        // 構成比率に基づくNAV計算
        tokens.forEach((t: any) => {
          const p = priceMap[t.symbol.toUpperCase()] || 0;
          currentNav += p * (t.weight / 100);
        });

        if (currentNav === 0) currentNav = 100; // 安全策

        // INSERT文作成
        statements.push(
          env.axis_db.prepare(
            "INSERT INTO strategy_snapshots (strategy_id, nav, timestamp) VALUES (?, ?, ?)"
          ).bind(strat.id, currentNav, now)
        );
      } catch (e) {
        console.error(`Failed to calc strat ${strat.id}`, e);
      }
    }

    // バッチ実行
    if (statements.length > 0) {
      await env.axis_db.batch(statements);
      console.log(`✅ Snapshotted ${statements.length} strategies.`);
    }

  } catch (e) {
    console.error("Cron Job Failed:", e);
  }
}