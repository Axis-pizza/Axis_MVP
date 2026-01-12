/**
 * Kagemusha Routes - Strategy & Vault API
 * Refactored to use new modular services
 */

import { Hono } from 'hono';
import { Bindings } from '../config/env';
import { StrategyGenerator, TOKEN_UNIVERSE } from '../services/strategy';
import { PriceService } from '../services/price';
import { JitoBundleService } from '../services/blockchain';

const app = new Hono<{ Bindings: Bindings }>();

const priceService = new PriceService();
const jitoService = new JitoBundleService();

/**
 * POST /analyze - Generate AI-powered strategy suggestions
 */
app.post('/analyze', async (c) => {
  try {
    const { directive, tags } = await c.req.json();
    
    if (!directive) {
      return c.json({ success: false, error: 'Directive is required' }, 400);
    }

    const generator = new StrategyGenerator(c.env);
    const strategies = await generator.generateStrategies(directive, tags || []);
    
    return c.json({ 
      success: true, 
      strategies,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[Kagemusha] Analyze failed:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /tokens - Get curated token universe with real-time prices
 */
app.get('/tokens', async (c) => {
  try {
    const symbols = TOKEN_UNIVERSE.map(t => t.symbol);
    const prices = await priceService.getPrices(symbols);
    
    const tokensWithPrices = TOKEN_UNIVERSE.map(token => ({
      ...token,
      price: prices[token.symbol]?.price || null,
      priceFormatted: prices[token.symbol]?.priceFormatted || 'N/A',
      priceSource: prices[token.symbol]?.source || 'unavailable',
    }));

    return c.json({ 
      success: true, 
      tokens: tokensWithPrices,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[Kagemusha] Token fetch failed:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /tokens/search - Search tokens by symbol or name
 */
app.get('/tokens/search', async (c) => {
  try {
    const query = c.req.query('q') || '';
    const limit = parseInt(c.req.query('limit') || '20');
    
    const tokens = await priceService.searchTokens(query, limit);
    
    return c.json({ success: true, tokens });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /tokens/:address/history - Get price history for charts
 */
app.get('/tokens/:address/history', async (c) => {
  try {
    const address = c.req.param('address');
    const interval = (c.req.query('interval') as '1h' | '1d' | '1w') || '1d';
    
    const history = await priceService.getPriceHistory(address, interval);
    
    if (!history) {
      return c.json({ success: false, error: 'History not available' }, 404);
    }

    return c.json({ success: true, history });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /deploy - Deploy strategy via Jito Bundle
 */
app.post('/deploy', async (c) => {
  try {
    const { signedTransaction, metadata, strategyId } = await c.req.json();
    
    if (!signedTransaction) {
      return c.json({ success: false, error: 'Signed transaction required' }, 400);
    }

    // Send via Jito for MEV protection
    const result = await jitoService.sendBundle([signedTransaction]);

    // Save to database
    if (metadata && c.env.axis_db) {
      const id = strategyId || crypto.randomUUID();
      await c.env.axis_db.prepare(
        'INSERT INTO strategies (id, owner_pubkey, name, type, config, jito_bundle_id) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        id,
        metadata.creator || 'unknown',
        metadata.name,
        metadata.type,
        JSON.stringify(metadata.composition),
        result.bundleId
      ).run();
    }

    return c.json({ 
      success: true, 
      bundleId: result.bundleId,
      strategyId: strategyId || crypto.randomUUID()
    });
  } catch (error: any) {
    console.error('[Kagemusha] Deploy failed:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /strategies/:pubkey - Get user's deployed strategies
 */
app.get('/strategies/:pubkey', async (c) => {
  try {
    const pubkey = c.req.param('pubkey');
    
    const results = await c.env.axis_db.prepare(
      'SELECT * FROM strategies WHERE owner_pubkey = ? ORDER BY created_at DESC'
    ).bind(pubkey).all();
    
    return c.json({ success: true, strategies: results.results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /prepare-deployment - Get Jito tip account for transaction
 */
app.get('/prepare-deployment', async (c) => {
  try {
    const tipAccount = await jitoService.getRandomTipAccount();
    
    return c.json({
      success: true,
      tipAccount,
      minTipLamports: 1000,
      recommendedTipLamports: 10000,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
