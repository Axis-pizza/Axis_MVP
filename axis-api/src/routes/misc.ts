import { Hono } from 'hono';
import { Bindings } from '../config/env';
import * as AIService from '../services/ai';
import * as SolanaService from '../services/solana';
import * as InviteModel from '../models/invite';
import * as AuthService from '../services/auth';

const app = new Hono<{ Bindings: Bindings }>();

app.post('/chat', async (c) => {
    try {
        const { history, currentState } = await c.req.json();
        const result = await AIService.processChat(history, currentState, c.env.GOOGLE_API_KEY);
        return c.json(result);
    } catch (e: any) {
        console.error("AI Error:", e);
        return c.json({ message: `System Error: ${e.message}`, uiAction: "NONE", data: {} });
    }
});

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

export default app;
