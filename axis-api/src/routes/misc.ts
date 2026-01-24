import { Hono } from 'hono';
import { Bindings } from '../config/env';
import * as AIService from '../services/ai';
import * as SolanaService from '../services/solana';
import * as InviteModel from '../models/invite';
import * as AuthService from '../services/auth';

const app = new Hono<{ Bindings: Bindings }>();

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

// --- Faucet Claim ---
app.post("/claim", async (c) => {
    const { wallet_address } = await c.req.json();
    try {
      const { signature, latestBlockhash, connection } = await SolanaService.claimFaucet(c.env.FAUCET_PRIVATE_KEY, wallet_address);
  
      c.executionCtx.waitUntil(
          SolanaService.confirmTransaction(connection, signature, latestBlockhash)
      );
      
      return c.json({ success: true, signature, message: "Sent 1,000 USDC (Devnet)" });
    } catch (e: any) {
        console.error(e);
        return c.json({ error: "Transfer failed: " + e.message }, 500);
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
  
    const invite = await InviteModel.findInviteByCode(c.env.axis_db, code);
    
    if (invite) {
      return c.json({ valid: true });
    } else {
      return c.json({ valid: false }, 400);
    }
});

app.get('/verify', async (c) => {
    const code = c.req.query('code')
    const valid = await AuthService.verifyUsersInvite(c.env.axis_db, code || "");
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
})

export default app;