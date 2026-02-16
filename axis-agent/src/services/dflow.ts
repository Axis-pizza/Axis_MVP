/**
 * dFlow Prediction Market Service
 *
 * Fetches active prediction market tokens from the axis-api /api/dflow/markets endpoint.
 * Each event produces YES and NO token pairs with probability prices (0.0–1.0).
 * These tokens are compatible with JupiterToken so they flow through existing UI.
 */

import type { JupiterToken } from './jupiter';
import { JupiterService } from './jupiter';

const AXIS_API_BASE = import.meta.env.VITE_API_URL || 'https://axis-api.yusukekikuta-05.workers.dev';
const CHAIN_ID = 101;

interface DFlowApiToken {
  mint: string;
  symbol: string;
  name: string;
  image: string;
  side: 'YES' | 'NO';
  eventId: string;
  eventTitle: string;
  marketId: string;
  marketTitle: string;
  expiry: string;
}

// --- Stock Mock Tokens ---
const XSTOCK_SYMBOLS = [
  "AAPLx",
  "TSLAx",
  "NVDAx",
  "MSFTx",
  "AMZNx",
  "GOOGLx",
  "SPYx",
  "QQQx",
];

// --- Commodity Mock Tokens ---
const REMORA_METALS = [
  { symbol: "GLDr",  name: "Gold (GLDr)",  mint: "AEv6xLECJ2KKmwFGX85mHb9S2c2BQE7dqE5midyrXHBb" },
  { symbol: "SLVr",  name: "Silver (SLVr)", mint: "7C56WnJ94iEP7YeH2iKiYpvsS5zkcpP9rJBBEBoUGdzj" },
  { symbol: "CPERr", name: "Copper (CPERr)",mint: "C3VLBJB2FhEb47s1WEgroyn3BnSYXaezqtBuu5WNmUGw" },
  { symbol: "PPLTr", name: "Platinum (PPLTr)", mint: "EtTQ2QRyf33bd6B2uk7nm1nkinrdGKza66EGdjEY4s7o" },
  { symbol: "PALLr", name: "Palladium (PALLr)", mint: "9eS6ZsnqNJGGKWq8LqZ95YJLZ219oDuJ1qjsLoKcQkmQ" },
] as const;


export async function fetchPredictionTokens(): Promise<JupiterToken[]> {
  try {
    const res = await fetch(`${AXIS_API_BASE}/api/dflow/markets`);
    if (!res.ok) throw new Error(`DFlow API error: ${res.status}`);

    const data = await res.json() as { tokens: DFlowApiToken[] };
    const apiTokens = data.tokens || [];

    return apiTokens.map((t): JupiterToken => ({
      address: t.mint,
      chainId: CHAIN_ID,
      decimals: 6,
      name: `${t.eventTitle} — ${t.side}`,
      symbol: `${t.marketId}-${t.side}`,
      logoURI: t.image,
      tags: ['prediction', t.side.toLowerCase()],
      isVerified: false,
      source: 'dflow',
      isMock: false,
      predictionMeta: {
        eventId: t.eventId,
        eventTitle: t.eventTitle,
        marketId: t.marketId,
        marketQuestion: t.marketTitle,
        side: t.side,
        expiry: t.expiry,
      },
    }));
  } catch (e) {
    console.warn('[dFlow] fetchPredictionTokens failed:', e);
    return [];
  }
}

export async function fetchStockTokens(): Promise<JupiterToken[]> {
  const found: JupiterToken[] = [];

  for (const sym of XSTOCK_SYMBOLS) {
    const results = await JupiterService.searchTokens(sym);

    const best =
      results.find(t => t.symbol?.toLowerCase() === sym.toLowerCase()) ??
      results[0];

    if (best) {
      found.push({
        ...best,
        tags: Array.from(new Set([...(best.tags ?? []), "stock", "xstocks"])),
        source: "stock",
        isMock: false,
      });
    }
  }

  const prices = await JupiterService.getPrices(found.map(t => t.address));
  const withPrices = found.map(t => ({
    ...t,
    price: prices[t.address] ?? t.price,
  }));

  return withPrices;
}

function fallbackToken(x: typeof REMORA_METALS[number]): JupiterToken {
  return {
    address: x.mint,
    chainId: CHAIN_ID,
    decimals: 6,
    name: x.name,
    symbol: x.symbol,
    logoURI: "",
    tags: ["commodity", "rwa", "remora", "metals"],
    isVerified: false,
    source: "commodity",
    isMock: false,
  };
}

export async function fetchCommodityTokens(): Promise<JupiterToken[]> {
  try {
    const tokens = await Promise.all(
      REMORA_METALS.map(async (x) => {
        const t = await JupiterService.getToken(x.mint);
        const base = t ?? fallbackToken(x);
        return {
          ...base,
          address: x.mint,
          symbol: base.symbol || x.symbol,
          name: base.name || x.name,
          tags: Array.from(new Set([...(base.tags ?? []), "commodity", "rwa", "remora", "metals"])),
          source: "commodity",
          isMock: false,
        } satisfies JupiterToken;
      })
    );

    const prices = await JupiterService.getPrices(tokens.map(t => t.address));
    const withPrices = tokens.map(t => ({ ...t, price: prices[t.address] ?? t.price }));

    return withPrices;
  } catch (e) {
    console.warn("[Remora] fetchCommodityTokens failed:", e);
    return REMORA_METALS.map(fallbackToken);
  }
}