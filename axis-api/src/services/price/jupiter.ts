/**
 * Jupiter Token & Price Service
 * Token metadata and pricing from Jupiter Aggregator
 */

import { TokenInfo, TokenPrice, PriceHistory } from '../../types';

const JUPITER_API_BASE = 'https://api.jup.ag';
const JUPITER_TOKEN_LIST = 'https://token.jup.ag/strict';
const COINGECKO_TOKEN_LIST = 'https://tokens.coingecko.com/solana/all.json';
const BIRDEYE_API = 'https://public-api.birdeye.so';

export class JupiterService {
  
  private tokenCache: TokenInfo[] = [];
  private cacheTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch strict token list from Jupiter
   */
  async getTokenList(): Promise<TokenInfo[]> {
    // Return cache if fresh
    if (this.tokenCache.length > 0 && Date.now() - this.cacheTime < this.CACHE_TTL) {
      return this.tokenCache;
    }

    try {
      try {
        const response = await fetch(JUPITER_TOKEN_LIST);
        if (!response.ok) throw new Error(`Jupiter returned ${response.status}`);
        
        const tokens: any[] = await response.json();
        
        this.tokenCache = tokens.map(t => ({
          symbol: t.symbol,
          name: t.name,
          address: t.address,
          decimals: t.decimals,
          logoURI: t.logoURI,
        }));
        console.log(`[Jupiter] Cached ${this.tokenCache.length} tokens from Jupiter (Strict)`);
      } catch (jupError) {
        console.warn(`[Jupiter] Failed to fetch from Jupiter (${jupError}), trying CoinGecko fallback...`);
        
        // Fallback to CoinGecko
        const response = await fetch(COINGECKO_TOKEN_LIST);
        if (!response.ok) throw new Error(`CoinGecko returned ${response.status}`);
        
        const data: any = await response.json();
        const tokens = data.tokens || []; // CoinGecko wraps in { tokens: [...] }
        
        this.tokenCache = tokens.map((t: any) => ({
          symbol: t.symbol,
          name: t.name,
          address: t.address,
          decimals: t.decimals,
          logoURI: t.logoURI,
        }));
        console.log(`[Jupiter] Cached ${this.tokenCache.length} tokens from CoinGecko`);
      }
      
      this.cacheTime = Date.now();
      return this.tokenCache;
    } catch (error) {
      console.error('[Jupiter] Token list fetch failed (all sources):', error);
      return this.tokenCache.length > 0 ? this.tokenCache : [];
    }
  }

  /**
   * Get token price via Jupiter Quote API
   * More reliable than Pyth for smaller tokens
   */
  async getTokenPrice(tokenAddress: string, vsToken: string = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'): Promise<number | null> {
    try {
      // Use Jupiter quote API: 1 unit of token -> USDC
      const url = `${JUPITER_API_BASE}/quote?inputMint=${tokenAddress}&outputMint=${vsToken}&amount=1000000000&slippageBps=50`;
      
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const data: any = await response.json();
      
      if (data.outAmount) {
        // USDC has 6 decimals
        const price = parseFloat(data.outAmount) / 1e6;
        return price;
      }
      
      return null;
    } catch (error) {
      console.error('[Jupiter] Price quote failed:', error);
      return null;
    }
  }

  /**
   * Get historical price data from Birdeye
   * Returns real OHLCV data for charting
   */
  async getPriceHistory(tokenAddress: string, interval: '1h' | '1d' | '1w' = '1d', limit: number = 30): Promise<PriceHistory | null> {
    try {
      // Birdeye public API for price history
      const timeframe = interval === '1h' ? '1H' : interval === '1d' ? '1D' : '1W';
      const url = `${BIRDEYE_API}/defi/history_price?address=${tokenAddress}&address_type=token&type=${timeframe}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.warn('[Birdeye] API returned', response.status);
        return null;
      }
      
      const data: any = await response.json();
      
      if (data.success && data.data?.items) {
        return {
          symbol: '',
          interval,
          data: data.data.items.map((item: any) => ({
            timestamp: item.unixTime * 1000,
            price: item.value,
          }))
        };
      }
      
      return null;
    } catch (error) {
      console.error('[Birdeye] History fetch failed:', error);
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
   * Get token by address
   */
  async getTokenByAddress(address: string): Promise<TokenInfo | null> {
    const tokens = await this.getTokenList();
    return tokens.find(t => t.address === address) || null;
  }
}
