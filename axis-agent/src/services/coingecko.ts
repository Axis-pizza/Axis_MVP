/**
 * CoinGecko Token Service
 * Fetches Solana ecosystem tokens directly from CoinGecko
 * Supports both Ranking List (Discovery) and Specific Mint Lookup (Tracking)
 */

import type { TokenInfo } from '../types';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Cache for token list
let tokenCache: TokenInfo[] = [];
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache for specific mint prices
const priceCache: Record<string, { price: number; change24h: number; timestamp: number }> = {};
const PRICE_CACHE_TTL = 60 * 1000; // 1 minute

// ✅ 追加: Solanaアドレスのバリデーション用正規表現 (Base58, 32-44文字)
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

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
 * 1. Fetch top Solana ecosystem tokens from CoinGecko (For Search/List)
 */
export async function fetchSolanaTokens(perPage: number = 250): Promise<TokenInfo[]> {
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
    });

    const response = await fetch(`${COINGECKO_API}/coins/markets?${params}`);
    if (!response.ok) throw new Error(`CoinGecko returned ${response.status}`);
    
    const markets: CoinGeckoToken[] = await response.json();
    
    tokenCache = markets
      .filter(m => m.symbol) 
      .map(m => ({
        symbol: m.symbol.toUpperCase(),
        name: m.name,
        // platforms.solanaがあればそれを優先、なければIDをフォールバックとして使う
        address: m.platforms?.solana || m.id, 
        logoURI: m.image,
        price: m.current_price,
        priceFormatted: formatPrice(m.current_price),
        change24h: m.price_change_percentage_24h,
      }));
    
    cacheTime = Date.now();
    return tokenCache;
  } catch (error) {
    console.error('[CoinGecko] Failed to fetch tokens:', error);
    return tokenCache.length > 0 ? tokenCache : [];
  }
}

/**
 * 2. Get specific market data for Mint Addresses (For Portfolio/Strategy Tracking)
 * Uses /simple/token_price which supports fetching by contract address
 */
export async function getMarketData(mints: string[]): Promise<Record<string, { price: number; change24h: number }>> {
  if (!mints || mints.length === 0) return {};

  // ✅ 修正: 厳格なバリデーション (undefined除外 + Base58チェック)
  // これにより "USDC" や "undefined" などの不正な文字列がAPIに飛ぶのを防ぎ、400エラーを回避します。
  const validMints = mints.filter(m => 
    m && 
    typeof m === 'string' && 
    m.length >= 32 && 
    SOLANA_ADDRESS_REGEX.test(m)
  );

  if (validMints.length === 0) return {};

  const now = Date.now();
  
  // キャッシュチェック
  const uncachedMints = validMints.filter(mint => {
    const cached = priceCache[mint];
    return !cached || (now - cached.timestamp > PRICE_CACHE_TTL);
  });

  if (uncachedMints.length === 0) {
    const result: Record<string, { price: number; change24h: number }> = {};
    validMints.forEach(mint => {
      if (priceCache[mint]) {
        result[mint] = { 
          price: priceCache[mint].price, 
          change24h: priceCache[mint].change24h 
        };
      }
    });
    return result;
  }

  // APIコール (チャンク分割)
  const chunks = chunkArray(uncachedMints, 10); 
  const fetchPromises = chunks.map(async (chunk) => {
    try {
      const ids = chunk.join(',');
      // URL生成
      const url = `${COINGECKO_API}/simple/token_price/solana?contract_addresses=${ids}&vs_currencies=usd&include_24hr_change=true`;
      
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`CoinGecko Error (${res.status}). Skipping chunk.`);
        return null;
      }
      return await res.json();
    } catch (e) {
      console.error("CoinGecko Batch Fetch Error:", e);
      return null;
    }
  });

  const results = await Promise.all(fetchPromises);

  // キャッシュ更新
  results.forEach(data => {
    if (!data) return;
    Object.entries(data).forEach(([mint, info]: [string, any]) => {
      const price = info.usd;
      const change = info.usd_24h_change;
      
      priceCache[mint] = {
        price,
        change24h: change,
        timestamp: now
      };
    });
  });

  // 結果構築
  const finalResult: Record<string, { price: number; change24h: number }> = {};
  validMints.forEach(mint => {
    const cached = priceCache[mint];
    if (cached) {
      finalResult[mint] = { price: cached.price, change24h: cached.change24h };
    }
  });

  return finalResult;
}

// Helper: Array Chunking
function chunkArray(array: string[], size: number) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// Helper: Price Formatter
function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

/**
 * Search tokens by query
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

export async function getTokenById(id: string): Promise<TokenInfo | null> {
  const tokens = await fetchSolanaTokens();
  return tokens.find(t => t.address === id) ?? null;
}

export async function getTokenBySymbol(symbol: string): Promise<TokenInfo | null> {
  const tokens = await fetchSolanaTokens();
  return tokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase()) ?? null;
}

export function clearTokenCache(): void {
  tokenCache = [];
  cacheTime = 0;
}

// Default Export
export const CoinGeckoService = {
  getMarketData,
  fetchSolanaTokens,
  searchTokens
};