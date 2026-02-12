/**
 * CoinGecko Token Service
 */

import type { TokenInfo } from '../types';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

let tokenCache: TokenInfo[] = [];
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

const priceCache: Record<string, { price: number; change24h: number; timestamp: number }> = {};
const PRICE_CACHE_TTL = 60 * 1000;

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

export async function getMarketData(mints: string[]): Promise<Record<string, { price: number; change24h: number }>> {
  if (!mints || mints.length === 0) return {};

  const validMints = mints.filter(m =>
    m &&
    typeof m === 'string' &&
    m.length >= 32 &&
    SOLANA_ADDRESS_REGEX.test(m)
  );

  if (validMints.length === 0) return {};

  const now = Date.now();

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

  const chunks = chunkArray(uncachedMints, 10);
  const fetchPromises = chunks.map(async (chunk) => {
    try {
      const ids = chunk.join(',');
      const url = `${COINGECKO_API}/simple/token_price/solana?contract_addresses=${ids}&vs_currencies=usd&include_24hr_change=true`;

      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  });

  const results = await Promise.all(fetchPromises);

  results.forEach(data => {
    if (!data) return;
    Object.entries(data).forEach(([mint, info]: [string, any]) => {
      priceCache[mint] = {
        price: info.usd,
        change24h: info.usd_24h_change,
        timestamp: now
      };
    });
  });

  const finalResult: Record<string, { price: number; change24h: number }> = {};
  validMints.forEach(mint => {
    const cached = priceCache[mint];
    if (cached) {
      finalResult[mint] = { price: cached.price, change24h: cached.change24h };
    }
  });

  return finalResult;
}

function chunkArray(array: string[], size: number) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

export const CoinGeckoService = {
  getMarketData,
  fetchSolanaTokens,
};
