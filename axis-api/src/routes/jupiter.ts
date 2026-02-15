import { Hono } from 'hono';
import { JupiterService } from '../services/jupiter';
import { Bindings } from '../config/env';

const jupiterRouter = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/jupiter/tokens
 * Verified トークンリストを取得
 */
jupiterRouter.get('/tokens', async (c) => {
  try {
    const apiKey = c.env.JUPITER_API_KEY;
    const tokens = await JupiterService.getTokens(apiKey);

    c.header('Cache-Control', 'public, max-age=3600');

    return c.json({
      success: true,
      tokens
    });
  } catch (e) {
    console.error(e);
    return c.json({
      success: false,
      error: 'Failed to fetch tokens',
      tokens: []
    }, 500);
  }
});

/**
 * GET /api/jupiter/search?q={query}
 * サーバーサイドトークン検索
 */
jupiterRouter.get('/search', async (c) => {
  try {
    const query = c.req.query('q');
    if (!query || query.trim().length === 0) {
      return c.json({ success: true, tokens: [] });
    }

    const apiKey = c.env.JUPITER_API_KEY;
    const tokens = await JupiterService.searchTokens(query, apiKey);

    c.header('Cache-Control', 'public, max-age=30');
    return c.json({ success: true, tokens });
  } catch (e) {
    console.error(e);
    return c.json({ success: false, error: 'Search failed', tokens: [] }, 500);
  }
});

/**
 * GET /api/jupiter/trending?category={cat}&interval={interval}&limit={n}
 * トレンドトークン取得
 */
jupiterRouter.get('/trending', async (c) => {
  try {
    const category = (c.req.query('category') || 'toptrending') as 'toporganicscore' | 'toptraded' | 'toptrending';
    const interval = (c.req.query('interval') || '24h') as '5m' | '1h' | '6h' | '24h';
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);

    const apiKey = c.env.JUPITER_API_KEY;
    const tokens = await JupiterService.getTrending(category, interval, limit, apiKey);

    c.header('Cache-Control', 'public, max-age=60');
    return c.json({ success: true, tokens });
  } catch (e) {
    console.error(e);
    return c.json({ success: false, error: 'Trending fetch failed', tokens: [] }, 500);
  }
});

/**
 * GET /api/jupiter/prices
 * Query: ?ids=MINT1,MINT2,...
 */
jupiterRouter.get('/prices', async (c) => {
  try {
    const idsQuery = c.req.query('ids');
    const ids = idsQuery ? idsQuery.split(',') : [];

    if (ids.length === 0) {
      return c.json({ success: true, prices: {} });
    }

    const apiKey = c.env.JUPITER_API_KEY;
    const prices = await JupiterService.getPrices(ids, apiKey);

    c.header('Cache-Control', 'public, max-age=30');

    return c.json({
      success: true,
      prices
    });
  } catch (e) {
    console.error(e);
    return c.json({
      success: false,
      error: 'Failed to fetch prices',
      prices: {}
    }, 500);
  }
});

export default jupiterRouter;
