/**
 * Price Index - Unified Price Service
 * Aggregates prices from multiple sources with fallback
 */

import { TokenPrice } from '../../types';
import { PythPriceService } from './pyth';
import { CoinGeckoService } from './coingecko';

export { PythPriceService } from './pyth';
export { CoinGeckoService } from './coingecko';

export class PriceService {
  private pythService: PythPriceService;
  private coingeckoService: CoinGeckoService;

  constructor() {
    this.pythService = new PythPriceService();
    this.coingeckoService = new CoinGeckoService();
  }

  /**
   * Get unified prices with multi-source fallback
   * Priority: Pyth -> CoinGecko -> Fallback
   */
  async getPrices(symbols: string[]): Promise<Record<string, TokenPrice>> {
    const prices: Record<string, TokenPrice> = {};

    // 1. Try Pyth first (most accurate for majors)
    const pythPrices = await this.pythService.getPrices(symbols);
    Object.assign(prices, pythPrices);

    // 2. For missing symbols, try CoinGecko
    const missingSymbols = symbols.filter(s => !prices[s]);
    
    if (missingSymbols.length > 0) {
      const tokens = await this.coingeckoService.getTokenList();
      
      for (const symbol of missingSymbols) {
        const token = tokens.find(t => t.symbol === symbol);
        if (token) {
          const price = await this.coingeckoService.getTokenPrice(token.address);
          if (price !== null) {
            prices[symbol] = {
              symbol,
              price,
              priceFormatted: price.toFixed(price >= 1 ? 2 : 6),
              confidence: 0.95,
              timestamp: Date.now(),
              source: 'coingecko' as const
            };
          }
        }
      }
    }

    return prices;
  }

  /**
   * Get token list (delegated to CoinGecko)
   */
  async getTokenList() {
    return this.coingeckoService.getTokenList();
  }

  /**
   * Get price history for charting
   */
  async getPriceHistory(coinId: string, interval: '1h' | '1d' | '1w' = '1d') {
    return this.coingeckoService.getPriceHistory(coinId, 30, interval);
  }

  /**
   * Search tokens
   */
  async searchTokens(query: string, limit?: number) {
    return this.coingeckoService.searchTokens(query, limit);
  }
}
