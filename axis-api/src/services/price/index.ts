/**
 * Price Index - Unified Price Service
 * Aggregates prices from multiple sources with fallback
 */

import { TokenPrice } from '../../types';
import { PythPriceService } from './pyth';
import { JupiterService } from './jupiter';

export { PythPriceService } from './pyth';
export { JupiterService } from './jupiter';

export class PriceService {
  private pythService: PythPriceService;
  private jupiterService: JupiterService;

  constructor() {
    this.pythService = new PythPriceService();
    this.jupiterService = new JupiterService();
  }

  /**
   * Get unified prices with multi-source fallback
   * Priority: Pyth -> Jupiter Quote -> Fallback
   */
  async getPrices(symbols: string[]): Promise<Record<string, TokenPrice>> {
    const prices: Record<string, TokenPrice> = {};

    // 1. Try Pyth first (most accurate for majors)
    const pythPrices = await this.pythService.getPrices(symbols);
    Object.assign(prices, pythPrices);

    // 2. For missing symbols, try Jupiter
    const missingSymbols = symbols.filter(s => !prices[s]);
    
    if (missingSymbols.length > 0) {
      const tokens = await this.jupiterService.getTokenList();
      
      for (const symbol of missingSymbols) {
        const token = tokens.find(t => t.symbol === symbol);
        if (token) {
          const price = await this.jupiterService.getTokenPrice(token.address);
          if (price !== null) {
            prices[symbol] = {
              symbol,
              price,
              priceFormatted: price.toFixed(price >= 1 ? 2 : 6),
              confidence: 0.95, // Jupiter quote confidence
              timestamp: Date.now(),
              source: 'jupiter'
            };
          }
        }
      }
    }

    return prices;
  }

  /**
   * Get token list (delegated to Jupiter)
   */
  async getTokenList() {
    return this.jupiterService.getTokenList();
  }

  /**
   * Get price history for charting
   */
  async getPriceHistory(tokenAddress: string, interval: '1h' | '1d' | '1w' = '1d') {
    return this.jupiterService.getPriceHistory(tokenAddress, interval);
  }

  /**
   * Search tokens
   */
  async searchTokens(query: string, limit?: number) {
    return this.jupiterService.searchTokens(query, limit);
  }
}
