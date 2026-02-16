// axis-api/src/routes/dflow.ts
import { Hono } from 'hono';
import { Bindings } from '../config/env';
import { DFlowService } from '../services/dflow';

const app = new Hono<{ Bindings: Bindings }>();

app.get('/markets', async (c) => {
  try {
    const tokens = await DFlowService.getActiveMarketTokens();
    c.header('Cache-Control', 'public, max-age=60'); // 60秒キャッシュ
    return c.json({ tokens });
  } catch (error) {
    return c.json({ error: 'Failed to fetch prediction markets' }, 500);
  }
});

export default app;