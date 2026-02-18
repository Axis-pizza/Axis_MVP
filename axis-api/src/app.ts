import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { Bindings } from './config/env';
import jupiterRouter from './routes/jupiter';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import vaultRoutes from './routes/vault';
import miscRoutes from './routes/misc';
import kagemushaRoutes from './routes/kagemusha';
import uploadRoutes from './routes/upload';
import shareRoutes from './routes/share';
import { runPriceSnapshot } from './services/snapshot';
import dflowRoutes from './routes/dflow';
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

app.get('/test-snapshot', async (c) => {
  console.log('--- 🛠️ Manual Snapshot Triggered 🛠️ ---');
  try {
   
    await runPriceSnapshot(c.env.axis_db);
    return c.json({ success: true, message: "Snapshot process finished. Check your terminal logs." });
  } catch (e: any) {
    console.error('Snapshot Error:', e);
    return c.json({ success: false, error: e.message }, 500);
  }
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
app.route('/api/jupiter', jupiterRouter);
app.route('/api/dflow', dflowRoutes);

app.post('/report', async (c) => {
  try {
   
    const body = await c.req.json() as { user_tg: string; message: string; image?: string };

    if (!body.user_tg || !body.message) {
      return c.json({ success: false, error: 'Missing fields' }, 400);
    }

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
  data: { user_tg: string; message: string; image?: string }
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

    if (data.image) {
      const matches = data.image.match(/^data:(.+);base64,(.+)$/);
      
      if (matches && matches.length === 3) {
        const contentType = matches[1];
        const base64Data = matches[2];
        const extension = contentType.split('/')[1] || 'png';

        msg.addAttachment({
          filename: `screenshot.${extension}`,
          contentType: contentType,
          data: base64Data,
          transferEncoding: 'base64'
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
    
    return true;

  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
}

async function distributeHoldingXP(env: Bindings) {
  try {
    const db = env.axis_db;
    const { results: strategies } = await db.prepare(
      "SELECT id, owner_pubkey, total_deposited FROM strategies"
    ).all();

    if (!strategies || strategies.length === 0) {
      return;
    }

    const userHoldings: Record<string, number> = {};

    for (const strat of strategies) {
      const owner = strat.owner_pubkey as string;
      let tvl = (strat.total_deposited as number) || 1000; 
      userHoldings[owner] = (userHoldings[owner] || 0) + tvl;
    }

    const CAP_USD = 5000;
    const XP_RATE = 1;

    for (const [pubkey, totalUsd] of Object.entries(userHoldings)) {
      const cappedUsd = Math.min(totalUsd, CAP_USD);
      const earnedXp = cappedUsd * XP_RATE;

      if (earnedXp > 0) {
        await db.prepare(
          `INSERT INTO xp_ledger (user_pubkey, amount, action_type, description) 
           VALUES (?, ?, 'HOLDING_REWARD', ?)`
        ).bind(pubkey, earnedXp, `Daily Holding XP ($${cappedUsd} capped)`).run();

        await db.prepare(
          "UPDATE users SET total_xp = total_xp + ? WHERE pubkey = ?"
        ).bind(earnedXp, pubkey).run();
        
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
          }
        }
      }
    }
  } catch (e) {
    console.error("❌ Cron Job Failed (XP):", e);
  }
}

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    const tasks: Promise<void>[] = [];
    tasks.push(
      runPriceSnapshot(env.axis_db).catch(e =>
        console.error('[Cron] Price snapshot failed:', e)
      )
    );
    if (event.cron === '0 * * * *') {
      tasks.push(
        distributeHoldingXP(env).catch(e =>
          console.error('[Cron] XP distribution failed:', e)
        )
      );
    }
    ctx.waitUntil(Promise.all(tasks));
  }
};