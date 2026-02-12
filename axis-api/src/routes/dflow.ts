import { Hono } from 'hono';
import { Bindings } from '../config/env';
import { DFlowService } from '../services/dflow';

const app = new Hono<{ Bindings: Bindings }>();

// GET /markets
app.get('/markets', async (c) => {
  try {
    const tokens = await DFlowService.getActiveMarketTokens();

    // キャッシュ制御: 市場情報は頻繁には変わらないので60秒キャッシュ
    c.header('Cache-Control', 'public, max-age=60');
    return c.json({ tokens });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch prediction markets' }, 500);
  }
});

export default app;
