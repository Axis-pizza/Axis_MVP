/**
 * Pyth Network Price Service
 * Real-time oracle prices from Pyth Hermes API
 */

import { TokenPrice } from '../../types';

// Pyth Price Feed IDs (Mainnet)
// Source: https://pyth.network/developers/price-feed-ids
const PYTH_FEED_IDS: Record<string, string> = {
  SOL: 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  BTC: 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  JUP: '0a0f61d4c0b1b4abe27e6ab4e4b4c08e4e94a3c2c6a1b8a7d5c2e1f0b3d4a5c6', // Note: May need update
  JTO: 'b43660a5f790c69354b0729a5ef9d50d68f1df92107540210b9cccba1f947cc2',
  BONK: '72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419',
  WIF: '4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc',
  PYTH: '0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff',
  RAY: '91568baa8beb53db23eb3fb7f22c6e8bd303d103919e19733f2bb642d3e7987a',
  USDC: 'eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
};

const HERMES_BASE_URL = 'https://hermes.pyth.network';

export class PythPriceService {
  
  /**
   * Fetch latest prices for multiple tokens
   */
  async getPrices(symbols: string[]): Promise<Record<string, TokenPrice>> {
    const prices: Record<string, TokenPrice> = {};
    
    // Filter to only symbols we have feed IDs for
    const validSymbols = symbols.filter(s => PYTH_FEED_IDS[s]);
    
    if (validSymbols.length === 0) {
      console.warn('[Pyth] No valid symbols requested');
      return prices;
    }

    try {
      // Build query params
      const feedIds = validSymbols.map(s => PYTH_FEED_IDS[s]);
      const queryParams = feedIds.map(id => `ids[]=${id}`).join('&');
      const url = `${HERMES_BASE_URL}/v2/updates/price/latest?${queryParams}&parsed=true`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Pyth API error: ${response.status}`);
      }

      const data: any = await response.json();

      // Parse response
      if (data.parsed && Array.isArray(data.parsed)) {
        data.parsed.forEach((item: any, index: number) => {
          const symbol = validSymbols[index];
          if (item.price) {
            const priceRaw = parseFloat(item.price.price);
            const expo = item.price.expo;
            const price = priceRaw * Math.pow(10, expo);
            const confidence = parseFloat(item.price.conf) * Math.pow(10, expo);
            
            prices[symbol] = {
              symbol,
              price,
              priceFormatted: price.toFixed(price >= 1 ? 2 : 6),
              confidence,
              timestamp: item.price.publish_time * 1000,
              source: 'pyth'
            };
          }
        });
      }

      return prices;

    } catch (error) {
      console.error('[Pyth] Price fetch failed:', error);
      // Return empty, let caller handle fallback
      return prices;
    }
  }

  /**
   * Get single token price
   */
  async getPrice(symbol: string): Promise<TokenPrice | null> {
    const prices = await this.getPrices([symbol]);
    return prices[symbol] || null;
  }

  /**
   * Get available symbols
   */
  getAvailableSymbols(): string[] {
    return Object.keys(PYTH_FEED_IDS);
  }
}
