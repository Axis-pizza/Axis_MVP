/**
 * CoinGecko Token Service - Client-side token fetching
 * Fetches Solana ecosystem tokens directly from CoinGecko
 * Safe for client-side as it uses public API with generous rate limits
 */

import type { TokenInfo } from '../types';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Cache for token list
let tokenCache: TokenInfo[] = [];
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface CoinGeckoToken {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  platforms?: {
    solana?: string;
  };
}

/**
 * Fetch top Solana ecosystem tokens from CoinGecko
 * Returns tokens sorted by market cap (only those with valid Solana addresses)
 */
export async function fetchSolanaTokens(perPage: number = 250): Promise<TokenInfo[]> {
  // Return cache if fresh
  if (tokenCache.length > 0 && Date.now() - cacheTime < CACHE_TTL) {
    return tokenCache;
  }

  try {
    const params = new URLSearchParams({
      vs_currency: 'usd',
      category: 'solana-ecosystem',
      order: 'market_cap_desc',
      per_page: String(perPage),
      page: '1',
      sparkline: 'false',
      include_platform: 'true', // Request platform data
    });

    const response = await fetch(`${COINGECKO_API}/coins/markets?${params}`);
    if (!response.ok) throw new Error(`CoinGecko returned ${response.status}`);
    
    const markets: CoinGeckoToken[] = await response.json();
    
    // Filter to only include tokens with valid Solana addresses
    tokenCache = markets
      .filter(m => {
        // Must have id, symbol, AND a Solana platform address
        return m.id && m.symbol && m.platforms?.solana;
      })
      .map(m => ({
        symbol: m.symbol.toUpperCase(),
        name: m.name,
        address: m.platforms!.solana!, // Use actual Solana address
        logoURI: m.image,
        price: m.current_price,
        priceFormatted: formatPrice(m.current_price),
        change24h: m.price_change_percentage_24h,
      }));
    
    cacheTime = Date.now();
    console.log(`[CoinGecko] Fetched ${tokenCache.length} Solana tokens (filtered from ${markets.length} total)`);
    
    return tokenCache;
  } catch (error) {
    console.error('[CoinGecko] Failed to fetch tokens:', error);
    return tokenCache.length > 0 ? tokenCache : [];
  }
}

/**
 * Search tokens by query (symbol or name)
 */
export async function searchTokens(query: string, limit: number = 20): Promise<TokenInfo[]> {
  const tokens = await fetchSolanaTokens();
  const q = query.toLowerCase();
  
  return tokens
    .filter(t => 
      t.symbol.toLowerCase().includes(q) || 
      t.name.toLowerCase().includes(q)
    )
    .slice(0, limit);
}

/**
 * Get token by ID (CoinGecko ID)
 */
export async function getTokenById(id: string): Promise<TokenInfo | null> {
  const tokens = await fetchSolanaTokens();
  return tokens.find(t => t.address === id) ?? null;
}

/**
 * Get token by symbol
 */
export async function getTokenBySymbol(symbol: string): Promise<TokenInfo | null> {
  const tokens = await fetchSolanaTokens();
  return tokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase()) ?? null;
}

/**
 * Get set of token addresses (for validation)
 */
export async function getTokenAddressSet(): Promise<Set<string>> {
  const tokens = await fetchSolanaTokens();
  return new Set(tokens.map(t => t.address));
}

/**
 * Format price for display
 */
function formatPrice(price: number): string {
  if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toFixed(6)}`;
  }
}

/**
 * Clear the token cache (useful for refresh)
 */
export function clearTokenCache(): void {
  tokenCache = [];
  cacheTime = 0;
}
