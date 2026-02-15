/**
 * Price Fetcher for Snapshot Worker
 *
 * Mint-address based price fetching with DexScreener (primary) + Jupiter (fallback).
 * Guarantees each mint is fetched at most once per run via deduplication.
 */

import { STRICT_LIST } from '../../config/constants';

export interface PriceResult {
  price_usd: number;
  source: string;
}

const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens';
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2';
const DEXSCREENER_BATCH_SIZE = 30;

/**
 * Build a symbol → mint lookup from STRICT_LIST for resolving tokens without mint addresses.
 */
const SYMBOL_TO_MINT: Record<string, string> = {};
for (const t of STRICT_LIST) {
  SYMBOL_TO_MINT[t.symbol.toUpperCase()] = t.address;
}

/**
 * Resolve a mint address from a token entry.
 * Falls back to STRICT_LIST symbol→mint mapping.
 */
export function resolveMint(token: { mint?: string; address?: string; symbol?: string }): string | null {
  if (token.mint && token.mint.length > 20) return token.mint;
  if (token.address && token.address.length > 20) return token.address;
  if (token.symbol) {
    return SYMBOL_TO_MINT[token.symbol.toUpperCase()] || null;
  }
  return null;
}

/**
 * Fetch prices for a list of unique mint addresses.
 * Returns a Map<mint, PriceResult>. Every input mint will have an entry;
 * mints that fail all sources get { price_usd: 0, source: 'none' }.
 */
export async function fetchPrices(mints: string[]): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();

  // Initialize all mints with zero
  for (const mint of mints) {
    results.set(mint, { price_usd: 0, source: 'none' });
  }

  if (mints.length === 0) return results;

  // --- Primary: DexScreener ---
  const remaining = new Set(mints);
  try {
    await fetchFromDexScreener(mints, results);
    for (const mint of mints) {
      if (results.get(mint)!.price_usd > 0) {
        remaining.delete(mint);
      }
    }
  } catch (e) {
    console.error('[PriceFetcher] DexScreener batch failed:', e);
  }

  // --- Fallback: Jupiter for remaining ---
  if (remaining.size > 0) {
    try {
      await fetchFromJupiter([...remaining], results);
    } catch (e) {
      console.error('[PriceFetcher] Jupiter fallback failed:', e);
    }
  }

  return results;
}

/**
 * DexScreener: batch fetch in chunks of 30.
 */
async function fetchFromDexScreener(
  mints: string[],
  results: Map<string, PriceResult>
): Promise<void> {
  for (let i = 0; i < mints.length; i += DEXSCREENER_BATCH_SIZE) {
    const chunk = mints.slice(i, i + DEXSCREENER_BATCH_SIZE);
    const url = `${DEXSCREENER_API}/${chunk.join(',')}`;

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Axis-Snapshot/1.0' },
      });
      if (!res.ok) {
        console.warn(`[DexScreener] HTTP ${res.status} for chunk ${i}`);
        continue;
      }

      const data: any = await res.json();
      if (!data.pairs || !Array.isArray(data.pairs)) continue;

      // Build mint → best-price map (highest liquidity pair wins)
      const seen = new Map<string, { price: number; liquidity: number }>();
      for (const pair of data.pairs) {
        const mint = pair.baseToken?.address;
        if (!mint) continue;
        const price = parseFloat(pair.priceUsd);
        const liquidity = pair.liquidity?.usd || 0;
        if (isNaN(price) || price <= 0) continue;

        const existing = seen.get(mint);
        if (!existing || liquidity > existing.liquidity) {
          seen.set(mint, { price, liquidity });
        }
      }

      for (const [mint, { price }] of seen) {
        if (results.has(mint)) {
          results.set(mint, { price_usd: price, source: 'dexscreener' });
        }
      }
    } catch (e) {
      console.warn(`[DexScreener] Chunk ${i} fetch error:`, e);
    }
  }
}

/**
 * Jupiter Price API v2: batch fetch all at once.
 */
async function fetchFromJupiter(
  mints: string[],
  results: Map<string, PriceResult>
): Promise<void> {
  const url = `${JUPITER_PRICE_API}?ids=${mints.join(',')}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Axis-Snapshot/1.0' },
    });
    if (!res.ok) {
      console.warn(`[Jupiter] HTTP ${res.status}`);
      return;
    }

    const data: any = await res.json();
    if (!data.data) return;

    for (const mint of mints) {
      const entry = data.data[mint];
      if (entry && entry.price) {
        const price = parseFloat(entry.price);
        if (!isNaN(price) && price > 0) {
          results.set(mint, { price_usd: price, source: 'jupiter' });
        }
      }
    }
  } catch (e) {
    console.warn('[Jupiter] Fetch error:', e);
  }
}
