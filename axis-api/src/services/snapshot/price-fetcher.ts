/**
 * Price Fetcher for Snapshot Worker (Pure Debug Version)
 * KNOWN_MINTS removed to test raw API behavior.
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
  // Debug log: what are we trying to resolve?
  // console.log(`[ResolveMint] Resolving: ${JSON.stringify(token)}`);

  if (token.mint && token.mint.length > 20) return token.mint;
  if (token.address && token.address.length > 20) return token.address;
  if (token.symbol) {
    const sym = token.symbol.toUpperCase();
    const resolved = SYMBOL_TO_MINT[sym];
    if (resolved) {
      // console.log(`[ResolveMint] Resolved ${sym} -> ${resolved}`);
      return resolved;
    }
    console.warn(`[ResolveMint] Failed to resolve symbol from STRICT_LIST: ${sym}`);
  }
  return null;
}

/**
 * Fetch prices for a list of unique mint addresses.
 * Returns a Map<mint, PriceResult>.
 */
export async function fetchPrices(mints: string[]): Promise<Map<string, PriceResult>> {
  console.log(`[FetchPrices] START. Total mints: ${mints.length}`);
  console.log(`[FetchPrices] Target Mints:`, mints);

  const results = new Map<string, PriceResult>();

  // Initialize with 0
  for (const mint of mints) {
    results.set(mint, { price_usd: 0, source: 'none' });
  }

  if (mints.length === 0) return results;

  const remaining = new Set(mints);

  // --- 1. DexScreener ---
  console.log(`[FetchPrices] Calling DexScreener...`);
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

  console.log(`[FetchPrices] After DexScreener, remaining count: ${remaining.size}`);

  // --- 2. Jupiter Fallback ---
  if (remaining.size > 0) {
    try {
      const remainingMints = [...remaining];
      console.log(`[FetchPrices] Calling Jupiter fallback for ${remainingMints.length} mints...`);
      // console.log(`[FetchPrices] Jupiter Targets:`, remainingMints);
      
      await fetchFromJupiter(remainingMints, results);
    } catch (e) {
      console.error('[PriceFetcher] Jupiter fallback failed:', e);
    }
  }

  // --- Final Report ---
  console.log('--- [FetchPrices] FINAL RESULTS ---');
  for (const mint of mints) {
    const res = results.get(mint);
    if (res?.price_usd === 0) {
      console.error(`❌ [FAILURE] ${mint} : Price is 0. (Source: ${res.source})`);
    } else {
      console.log(`✅ [SUCCESS] ${mint} : $${res?.price_usd} (Source: ${res?.source})`);
    }
  }
  console.log('-----------------------------------');

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

    console.log(`[DexScreener] Chunk ${i/DEXSCREENER_BATCH_SIZE + 1}: Fetching ${chunk.length} mints...`);

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Axis-Snapshot/1.0' },
      });
      if (!res.ok) {
        console.warn(`[DexScreener] HTTP ${res.status} for chunk starting at index ${i}`);
        continue;
      }

      const data: any = await res.json();
      if (!data.pairs || !Array.isArray(data.pairs)) {
        console.warn(`[DexScreener] No 'pairs' array in response.`);
        continue;
      }

      // Build mint → best-price map
      const seen = new Map<string, { price: number; liquidity: number; pairAddress: string }>();
      
      for (const pair of data.pairs) {
        const mint = pair.baseToken?.address;
        if (!mint) continue;
        const price = parseFloat(pair.priceUsd);
        const liquidity = pair.liquidity?.usd || 0;
        
        if (isNaN(price) || price <= 0) continue;

        const existing = seen.get(mint);
        if (!existing || liquidity > existing.liquidity) {
          seen.set(mint, { price, liquidity, pairAddress: pair.pairAddress });
        }
      }

      for (const [mint, val] of seen) {
        if (results.has(mint)) {
          results.set(mint, { price_usd: val.price, source: 'dexscreener' });
          // console.log(`[DexScreener] Got ${mint} from pair ${val.pairAddress}`);
        }
      }
    } catch (e) {
      console.warn(`[DexScreener] Chunk fetch error:`, e);
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
  // console.log(`[Jupiter] URL: ${url}`);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Axis-Snapshot/1.0' },
    });
    if (!res.ok) {
      console.warn(`[Jupiter] HTTP ${res.status}`);
      return;
    }

    const data: any = await res.json();
    if (!data.data) {
        console.warn(`[Jupiter] Response missing 'data' field.`);
        return;
    }

    for (const mint of mints) {
      const entry = data.data[mint];
      if (entry && entry.price) {
        const price = parseFloat(entry.price);
        if (!isNaN(price) && price > 0) {
          results.set(mint, { price_usd: price, source: 'jupiter' });
          console.log(`[Jupiter] Recovered price for ${mint}: ${price}`);
        }
      } else {
        console.warn(`[Jupiter] Mint not found in response: ${mint}`);
      }
    }
  } catch (e) {
    console.warn('[Jupiter] Fetch error:', e);
  }
}