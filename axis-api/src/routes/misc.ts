import { Hono } from 'hono';
import { Bindings } from '../config/env';
import * as AIService from '../services/ai';
import * as SolanaService from '../services/solana';
import * as InviteModel from '../models/invite';
import * as UserModel from '../models/user';
import * as AuthService from '../services/auth';
import { runPriceSnapshot } from '../services/snapshot';

const app = new Hono<{ Bindings: Bindings }>();

const FRONTEND_BASE_URL = 'https://app.axis-protocol.xyz'; 
const LOGO_URL = `${FRONTEND_BASE_URL}/ETFtoken.png`;

// --- AI Chat ---
app.post('/chat', async (c) => {
    try {
        const { history, currentState } = await c.req.json();
        const result = await AIService.processChat(history, currentState, c.env);
        return c.json(result);
    } catch (e: any) {
        console.error("AI Error:", e);
        return c.json({ message: `System Error: ${e.message}`, uiAction: "NONE", data: {} });
    }
});

app.get('/metadata/:ticker', (c) => {
    const ticker = c.req.param('ticker');
    const name = c.req.query('name') || `${ticker} ETF`;
    
    // URL生成 (自分のAPIのURL)
    const url = new URL(c.req.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    return c.json({
      name: name,
      symbol: ticker,
      description: `Axis Protocol Strategy Token: ${name}`,
      image: LOGO_URL, // ★ ここで固定画像を指定
      external_url: `${FRONTEND_BASE_URL}/`,
      attributes: [
        { trait_type: "Type", value: "ETF Strategy" },
        { trait_type: "Platform", value: "Axis Protocol" }
      ],
      properties: {
        files: [
          {
            uri: LOGO_URL,
            type: "image/png"
          }
        ]
      }
    });
});

// --- Faucet Claim ---
app.post("/claim", async (c) => {
    const { wallet_address } = await c.req.json();
    if (!wallet_address) return c.json({ error: "Wallet address required" }, 400);

    try {
      // 未登録ウォレットでも rate limit を適用するため、レコードがなければ自動作成
      let user = await UserModel.findUserByWallet(c.env.axis_db_core, wallet_address);

      if (!user) {
          const newId = crypto.randomUUID();
          const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          try {
              await c.env.axis_db_core.prepare(
                  'INSERT INTO users (id, wallet_address, invite_code, total_xp, rank_tier, last_checkin, last_faucet_at) VALUES (?, ?, ?, 500, "Bronze", 0, 0)'
              ).bind(newId, wallet_address, inviteCode).run();
          } catch {
              // INSERT 競合（並列リクエスト等）の場合は無視して再取得
          }
          user = await UserModel.findUserByWallet(c.env.axis_db_core, wallet_address);
      }

      // 日本時間(UTC+9)基準で同じ日かチェック（登録済み・未登録問わず）
      if (user) {
          const now = Math.floor(Date.now() / 1000);
          const lastFaucet = user.last_faucet_at || 0;
          const JST_OFFSET = 9 * 3600;
          const todayJST = Math.floor((now + JST_OFFSET) / 86400);
          const lastClaimDayJST = Math.floor((lastFaucet + JST_OFFSET) / 86400);

          if (lastFaucet > 0 && todayJST === lastClaimDayJST) {
              return c.json({
                  success: false,
                  message: `⏳ Already claimed today. Resets at midnight (JST).`
              }, 429);
          }
      }

      // rate limit 記録を先に更新してから送金（二重クレーム防止）
      await c.env.axis_db_core.prepare(
          "UPDATE users SET last_faucet_at = ? WHERE wallet_address = ?"
      ).bind(Math.floor(Date.now() / 1000), wallet_address).run();

      const { signature, latestBlockhash, connection } = await SolanaService.claimFaucet(c.env.FAUCET_PRIVATE_KEY, wallet_address, c.env.HELIUS_RPC_URL);

      c.executionCtx.waitUntil(
          SolanaService.confirmTransaction(connection, signature, latestBlockhash)
      );

      return c.json({ success: true, signature, message: "💰 Sent 1,000 USDC (Devnet)" });

    } catch (e: any) {
        console.error("Faucet Error:", e);
        return c.json({ error: "Transfer failed: " + e.message }, 500);
    }
});

// --- Fee Payer Signing ---
// フロントエンドから受け取ったトランザクションにサーバーを fee payer として部分署名して返す
// ユーザーは SOL 不要でトランザクションを実行できる
app.post('/fee-payer/sign', async (c) => {
    try {
        const { transaction: txBase64 } = await c.req.json();
        if (!txBase64) return c.json({ error: 'transaction required' }, 400);

        const signedTxBase64 = await SolanaService.signAsFeePayer(
            c.env.SERVER_PRIVATE_KEY,
            txBase64
        );

        return c.json({ transaction: signedTxBase64 });
    } catch (e: any) {
        console.error('Fee payer sign error:', e);
        return c.json({ error: e.message || 'Signing failed' }, 500);
    }
});

// --- Price Proxy (★追加) ---
// FrontendからのCORSエラーを回避するためのプロキシ
app.get('/price/sol', async (c) => {
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
            headers: {
                'User-Agent': 'Axis-Protocol/1.0', // 一部のAPIはUAがないと弾く場合があるため念のため
                'Accept': 'application/json'
            }
        });
        
        if (!res.ok) {
            throw new Error(`Coingecko API Error: ${res.status}`);
        }

        const data = await res.json() as any;
        return c.json({ price: data.solana?.usd || 0 });

    } catch (e) {
        console.error('Price Fetch Error:', e);
        // エラー時はUIを壊さないためにフォールバック価格（概算値）を返す
        return c.json({ price: 200.0 }); 
    }
});

// --- Invite Verification ---
app.get('/verify-invite', async (c) => {
    const code = c.req.query('code');
    if (!code) return c.json({ valid: false });
  
    const invite = await InviteModel.findInviteByCode(c.env.axis_db_core, code);
    
    if (invite) {
      return c.json({ valid: true });
    } else {
      return c.json({ valid: false }, 400);
    }
});

app.get('/verify', async (c) => {
    const code = c.req.query('code')
    const valid = await AuthService.verifyUsersInvite(c.env.axis_db_core, code || "");
    if (valid) {
      return c.json({ valid: true })
    } else {
      return c.json({ valid: false, message: 'Invalid code' }, 404)
    }
})

// --- Bug Report ---
app.post('/submit-bug', async (c) => {
    try {
        const { discord, description } = await c.req.json();

        if (!discord || !description) {
            return c.json({ success: false, message: "Discord ID and Description are required." }, 400);
        }

        const adminEmail = c.env.ADMIN_EMAIL || "admin@example.com"; 
        const senderEmail = c.env.SENDER_EMAIL || "no-reply@example.com"; 

        await c.env.EMAIL.send({
            to: adminEmail,
            from: senderEmail,
            subject: `[Axis Bug Report] from ${discord}`,
            content: [
                { type: "text/plain", value: `User: ${discord}\n\nDescription:\n${description}` }
            ]
        });

        return c.json({ success: true, message: "Report sent successfully." });
    } catch (e: any) {
        console.error("Email Error:", e);
        return c.json({ success: false, message: `Failed to send email: ${e.message}` }, 500);
    }
});

// スナップショット手動トリガー
app.post('/admin/snapshot/trigger', async (c) => {
try {
        const startMs = Date.now()
        const countResult = await c.env.axis_db_core.prepare('SELECT COUNT(*) as count FROM strategies').first();
        const strategyCount = countResult?.count ?? 0;
        await runPriceSnapshot(c.env.axis_db_core, c.env.axis_db_analytics);

        return c.json({ success: true, elapsed_ms: Date.now() - startMs, strategies: strategyCount })
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500)
    }
})

export default app;