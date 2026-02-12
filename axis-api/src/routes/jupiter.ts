import { Hono } from 'hono';
import { JupiterService } from '../services/jupiter';
import { Bindings } from '../config/env';

const jupiterRouter = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/jupiter/tokens
 * トークンリスト全量を取得
 */
jupiterRouter.get('/tokens', async (c) => {
  try {
    const tokens = await JupiterService.getTokens();
    
    // クライアント側でのキャッシュを効かせるため Cache-Control ヘッダーをセット
    c.header('Cache-Control', 'public, max-age=3600'); // 1時間キャッシュ推奨
    
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

    // 環境変数からAPIキーを取得
    const apiKey = c.env.JUPITER_API_KEY;

    // サービス層へ渡す
    const prices = await JupiterService.getPrices(ids, apiKey);
    
    // 価格は変動するためキャッシュ時間は短く、またはなし
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