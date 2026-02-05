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
import shareRoutes from './routes/share';

// @ts-ignore
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

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

app.get('/init-db', async (c) => {
  try {
    await c.env.axis_db.prepare(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        strategy_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(user_id, strategy_id)
      );
    `).run();

    return c.json({ success: true, message: "Table 'watchlist' created successfully!" });
  } catch (e: any) {
    return c.json({ success: false, error: e.message });
  }
});

// --- Mount Routes ---
app.route('/auth', authRoutes);
app.route('/', userRoutes);
app.route('/', vaultRoutes);
app.route('/', miscRoutes);
app.route('/', kagemushaRoutes);
app.route('/upload', uploadRoutes);
app.route('/share', shareRoutes);

app.post('/report', async (c) => {
  try {
   
    const body = await c.req.json() as { user_tg: string; message: string; image?: string };

    if (!body.user_tg || !body.message) {
      return c.json({ success: false, error: 'Missing fields' }, 400);
    }

    console.log(`📨 Received Report from ${body.user_tg} (Has Image: ${!!body.image})`);

  
    const sent = await sendBugReportEmail(c.env, body);

    if (sent) {
      return c.json({ success: true, message: 'Report transmitted.' });
    } else {
      return c.json({ success: false, error: 'Failed to transmit signal.' }, 500);
    }
  } catch (e) {
    console.error(e);
    return c.json({ success: false, error: 'Invalid Request' }, 400);
  }
});



async function sendBugReportEmail(
  env: Bindings, 
  data: { user_tg: string; message: string; image?: string } // imageを追加
) {
  const ADMIN_EMAIL = "yusukekikuta.05@gmail.com";
  
  try {
    const msg = createMimeMessage();
    
    msg.setSender({ name: "Axis", addr: "noreply@axis-protocol.xyz" });
    msg.setRecipient(ADMIN_EMAIL);
    msg.setSubject(`[SIGNAL] Report from ${data.user_tg}`);
    
    msg.addMessage({
      contentType: 'text/html',
      data: `
        <div style="font-family: 'Courier New', monospace; background-color: #050505; color: #e5e5e5; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; border: 1px solid #333; border-radius: 4px; overflow: hidden;">
            <div style="background-color: #111; padding: 15px 20px; border-bottom: 1px solid #333; display: flex; align-items: center; justify-content: space-between;">
              <span style="color: #f97316; font-weight: bold; letter-spacing: 2px;">KAGEMUSHA // SIGNAL</span>
              <span style="font-size: 12px; color: #666;">${new Date().toISOString()}</span>
            </div>

            <div style="padding: 30px;">
              <div style="margin-bottom: 25px;">
                <p style="margin: 0; color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">SOURCE ID</p>
                <h2 style="margin: 5px 0; font-size: 24px; color: #fff;">${data.user_tg}</h2>
              </div>
              <hr style="border: 0; border-top: 1px dashed #333; margin: 20px 0;" />
              <div>
                <p style="margin: 0 0 10px 0; color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">DECODED MESSAGE</p>
                <div style="background-color: #000; padding: 15px; border-left: 3px solid #f97316; color: #ddd; white-space: pre-wrap; line-height: 1.6;">${data.message}</div>
              </div>
              
              ${data.image ? '<p style="margin-top:20px; color:#666; font-size:10px;">* SCREENSHOT ATTACHED</p>' : ''}
            </div>

            <div style="background-color: #111; padding: 15px; text-align: center; border-top: 1px solid #333;">
              <p style="margin: 0; color: #444; font-size: 10px;">SECURE TRANSMISSION // AXIS PROTOCOL</p>
            </div>
          </div>
        </div>
      `
    });

    // ★★★ ここが重要: 画像があれば添付する ★★★
    if (data.image) {
      // フロントから来るデータ形式: "data:image/png;base64,iVBORw0KGgoAAA..."
      // ここからヘッダーとデータを分離する必要があります
      const matches = data.image.match(/^data:(.+);base64,(.+)$/);
      
      if (matches && matches.length === 3) {
        const contentType = matches[1]; // 例: "image/png"
        const base64Data = matches[2];  // 例: "iVBORw0..." (純粋なデータ)
        const extension = contentType.split('/')[1] || 'png';

        msg.addAttachment({
          filename: `screenshot.${extension}`,
          contentType: contentType,
          data: base64Data,
          transferEncoding: 'base64' // 明示的に指定
        });
      }
    }

    const message = new EmailMessage(
      "noreply@axis-protocol.xyz",
      ADMIN_EMAIL,
      msg.asRaw()
    );

    // @ts-ignore
    await env.EMAIL.send(message);
    
    console.log(`✅ Email sent to ${ADMIN_EMAIL}`);
    return true;

  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
}


// --- Helper 1: 全戦略の価格を保存するロジック (既存のまま) ---
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
      .map(sym => symbolToId[sym] || 'solana')
      .join(',');

    // 4. CoinGeckoから一括価格取得
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`,
      { headers: { 'User-Agent': 'Axis-Indexer/1.0' } }
    );
    
    let priceMap: Record<string, number> = {};
    if (res.ok) {
      const pricesData: any[] = await res.json();
      pricesData.forEach(p => {
        const sym = Object.keys(symbolToId).find(key => symbolToId[key] === p.id) || p.symbol.toUpperCase();
        priceMap[sym] = p.current_price;
      });
    } else {
      console.warn("Snapshot: Price fetch failed, using fallback.");
    }
    
    priceMap['SOL'] = priceMap['SOL'] || 145;
    priceMap['USDC'] = priceMap['USDC'] || 1;

    // 5. 各戦略のNAV計算 & 保存
    const statements = [];
    for (const strat of strategies) {
      try {
        const tokens = JSON.parse(strat.config as string);
        let currentNav = 0;
        tokens.forEach((t: any) => {
          const p = priceMap[t.symbol.toUpperCase()] || 0;
          currentNav += p * (t.weight / 100);
        });
        if (currentNav === 0) currentNav = 100;
        statements.push(
          env.axis_db.prepare(
            "INSERT INTO strategy_snapshots (strategy_id, nav, timestamp) VALUES (?, ?, ?)"
          ).bind(strat.id, currentNav, now)
        );
      } catch (e) {
        console.error(`Failed to calc strat ${strat.id}`, e);
      }
    }

    if (statements.length > 0) {
      await env.axis_db.batch(statements);
      console.log(`✅ Snapshotted ${statements.length} strategies.`);
    }

  } catch (e) {
    console.error("Cron Job Failed:", e);
  }
}

// --- ★Helper 2: Holding XP 配布ロジック (新規追加) ---
async function distributeHoldingXP(env: Bindings) {
  try {
    const db = env.axis_db;
    
    // 1. 全戦略を取得 (total_deposited があるもの)
    const { results: strategies } = await db.prepare(
      "SELECT id, owner_pubkey, total_deposited FROM strategies"
    ).all();

    if (!strategies || strategies.length === 0) {
      console.log("⚠️ No strategies found for XP.");
      return;
    }

    console.log(`🔍 Processing ${strategies.length} strategies for XP...`);

    // ユーザーごとの集計用マップ
    const userHoldings: Record<string, number> = {};

    // 2. ユーザーごとの保有額(TVL)を集計
    for (const strat of strategies) {
      const owner = strat.owner_pubkey as string;
      // Devnet特例: total_deposited が 0 なら $1,000 (テスト用) とみなす
      // ※ 本番では || 1000 を削除してください
      let tvl = (strat.total_deposited as number) || 1000; 
      
      userHoldings[owner] = (userHoldings[owner] || 0) + tvl;
    }

    // 3. XP計算 & 配布
    const CAP_USD = 5000;     // Season 0 Cap
    const XP_RATE = 1;        // 1 XP per $1

    for (const [pubkey, totalUsd] of Object.entries(userHoldings)) {
      // キャップ適用
      const cappedUsd = Math.min(totalUsd, CAP_USD);
      
      // 獲得XP計算
      const earnedXp = cappedUsd * XP_RATE;

      if (earnedXp > 0) {
        // A. 本人に付与
        await db.prepare(
          `INSERT INTO xp_ledger (user_pubkey, amount, action_type, description) 
           VALUES (?, ?, 'HOLDING_REWARD', ?)`
        ).bind(pubkey, earnedXp, `Daily Holding XP ($${cappedUsd} capped)`).run();

        await db.prepare(
          "UPDATE users SET total_xp = total_xp + ? WHERE pubkey = ?"
        ).bind(earnedXp, pubkey).run();
        
        console.log(`✨ Paid ${earnedXp} XP to ${pubkey} (Holdings: $${totalUsd})`);

        // B. 紹介者ボーナス (10%)
        const user = await db.prepare("SELECT referrer_id FROM users WHERE pubkey = ?").bind(pubkey).first();
        if (user && user.referrer_id) {
          const bonus = Math.floor(earnedXp * 0.1);
          if (bonus >= 1) {
             await db.prepare(
              `INSERT INTO xp_ledger (user_pubkey, amount, action_type, description, related_id) 
               VALUES (?, ?, 'REFERRAL_BONUS', ?, ?)`
            ).bind(user.referrer_id, bonus, `Referral bonus from ${pubkey.slice(0,4)}...`, pubkey).run();

            await db.prepare(
              "UPDATE users SET total_xp = total_xp + ? WHERE pubkey = ?"
            ).bind(bonus, user.referrer_id).run();
            
            console.log(`🎁 Referral Bonus: ${bonus} XP to ${user.referrer_id}`);
          }
        }
      }
    }
    console.log("✅ Daily XP Distribution Complete!");

  } catch (e) {
    console.error("❌ Cron Job Failed (XP):", e);
  }
}

export default {
  
  fetch: app.fetch,

  // Cron Job (定期実行) のハンドラー
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    console.log("⏰ Cron Job Started: Daily Tasks...");
    
    ctx.waitUntil(Promise.all([
      snapshotAllStrategies(env), // 価格保存
      distributeHoldingXP(env)    // XP配布
    ]));
  }
};