/**
 * CoinGecko Token & Price Service
 * Token metadata and pricing for Solana ecosystem
 */

import { TokenInfo, TokenPrice, PriceHistory } from '../../types';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  // Solana contract address (if available)
  platforms?: { solana?: string };
}

export class CoinGeckoService {
  
  private tokenCache: TokenInfo[] = [];
  private cacheTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch top Solana ecosystem tokens from CoinGecko
   * Returns tokens sorted by market cap
   */
  async getTokenList(perPage: number = 100): Promise<TokenInfo[]> {
    // Return cache if fresh
    if (this.tokenCache.length > 0 && Date.now() - this.cacheTime < this.CACHE_TTL) {
      return this.tokenCache;
    }

    try {
      const params = new URLSearchParams({
        vs_currency: 'usd',
        category: 'solana-ecosystem',
        order: 'market_cap_desc',
        per_page: String(perPage),
        page: '1',
        sparkline: 'false',
      });

      const response = await fetch(`${COINGECKO_API}/coins/markets?${params}`);
      if (!response.ok) throw new Error(`CoinGecko returned ${response.status}`);
      
      const markets: CoinGeckoMarket[] = await response.json();
      
      this.tokenCache = markets
        .filter(m => m.id && m.symbol) // Ensure valid data
        .map(m => ({
          symbol: m.symbol.toUpperCase(),
          name: m.name,
          // Use CoinGecko ID as fallback address; platforms.solana for real address
          address: m.id,
          logoURI: m.image,
          price: m.current_price,
          priceFormatted: `$${m.current_price?.toFixed(2) || '0.00'}`,
          change24h: m.price_change_percentage_24h,
        }));
      
      this.cacheTime = Date.now();
      console.log(`[CoinGecko] Cached ${this.tokenCache.length} Solana ecosystem tokens`);
      
      return this.tokenCache;
    } catch (error) {
      console.error('[CoinGecko] Token list fetch failed:', error);
      return this.tokenCache.length > 0 ? this.tokenCache : [];
    }
  }

  /**
   * Get token price by CoinGecko ID
   */
  async getTokenPrice(coinId: string): Promise<number | null> {
    try {
      const params = new URLSearchParams({
        ids: coinId,
        vs_currencies: 'usd',
      });

      const response = await fetch(`${COINGECKO_API}/simple/price?${params}`);
      if (!response.ok) return null;
      
      const data: Record<string, { usd?: number }> = await response.json();
      return data[coinId]?.usd ?? null;
    } catch (error) {
      console.error('[CoinGecko] Price fetch failed:', error);
      return null;
    }
  }

  /**
   * Get historical price data
   */
  async getPriceHistory(
    coinId: string,
    days: number = 30,
    interval: '1h' | '1d' | '1w' = '1d'
  ): Promise<PriceHistory | null> {
    try {
      // Map interval to CoinGecko format
      const cgInterval = interval === '1h' ? 'hourly' : 'daily';
      
      const params = new URLSearchParams({
        vs_currency: 'usd',
        days: String(days),
        interval: cgInterval,
      });

      const response = await fetch(`${COINGECKO_API}/coins/${coinId}/market_chart?${params}`);
      if (!response.ok) return null;
      
      const data: { prices?: [number, number][] } = await response.json();
      
      if (data.prices && Array.isArray(data.prices)) {
        return {
          symbol: coinId,
          interval,
          data: data.prices.map(([timestamp, price]) => ({
            timestamp,
            price,
          })),
        };
      }
      
      return null;
    } catch (error) {
      console.error('[CoinGecko] History fetch failed:', error);
      return null;
    }
  }

  /**
   * Search tokens by symbol or name
   */
  async searchTokens(query: string, limit: number = 10): Promise<TokenInfo[]> {
    const tokens = await this.getTokenList();
    const q = query.toUpperCase();
    
    return tokens
      .filter(t => 
        t.symbol.toUpperCase().includes(q) || 
        t.name.toUpperCase().includes(q)
      )
      .slice(0, limit);
  }

  /**
   * Get token by ID (CoinGecko ID)
   */
  async getTokenById(id: string): Promise<TokenInfo | null> {
    const tokens = await this.getTokenList();
    return tokens.find(t => t.address === id) || null;
  }

  /**
   * Get token by symbol
   */
  async getTokenBySymbol(symbol: string): Promise<TokenInfo | null> {
    const tokens = await this.getTokenList();
    return tokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase()) || null;
  }
}
