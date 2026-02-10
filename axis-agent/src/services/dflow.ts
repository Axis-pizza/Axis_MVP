/**
 * dFlow Prediction Market Service (Mock Phase 1)
 *
 * Returns mock prediction tokens for crypto, economy, and politics events.
 * Each event produces a YES and NO token pair with probability prices (0.0–1.0).
 * These tokens are compatible with JupiterToken so they flow through existing UI.
 */

import type { JupiterToken } from './jupiter';
import { JupiterService } from './jupiter';


const CHAIN_ID = 101;

interface EventDef {
  eventId: string;
  eventTitle: string;
  marketId: string;
  marketQuestion: string;
  expiry: string;
  logoURI: string;
  yesPrice: number;
  noPrice: number;
  yesMint: string;
  noMint: string;
  symbolPrefix: string;
}

const MOCK_EVENTS: EventDef[] = [
  {
    eventId: 'evt-btc-150k-2026',
    eventTitle: 'Bitcoin Price at End of 2026',
    marketId: 'mkt-btc-150k',
    marketQuestion: 'Above $150,000',
    expiry: '2026-12-31T23:59:59Z',
    logoURI: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    yesPrice: 0.42,
    noPrice: 0.58,
    yesMint: 'MOCK_BTC_150K_YES',
    noMint: 'MOCK_BTC_150K_NO',
    symbolPrefix: 'BTC-150K',
  },
  {
    eventId: 'evt-fed-rate-mar2026',
    eventTitle: 'Fed Interest Rate Decision (March 2026)',
    marketId: 'mkt-fed-cut-25bps',
    marketQuestion: 'Rate Cut >= 25bps',
    expiry: '2026-03-18T18:00:00Z',
    logoURI: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Seal_of_the_United_States_Federal_Reserve_System.svg/1200px-Seal_of_the_United_States_Federal_Reserve_System.svg.png',
    yesPrice: 0.30,
    noPrice: 0.70,
    yesMint: 'MOCK_FED_CUT_YES',
    noMint: 'MOCK_FED_CUT_NO',
    symbolPrefix: 'FED-CUT',
  },
  {
    eventId: 'evt-sol-ath-q1-2026',
    eventTitle: 'Solana ATH in Q1 2026',
    marketId: 'mkt-sol-500',
    marketQuestion: 'Reach $500?',
    expiry: '2026-03-31T23:59:59Z',
    logoURI: 'https://cryptologos.cc/logos/solana-sol-logo.png',
    yesPrice: 0.15,
    noPrice: 0.85,
    yesMint: 'MOCK_SOL_ATH_YES',
    noMint: 'MOCK_SOL_ATH_NO',
    symbolPrefix: 'SOL-ATH',
  },
  {
    eventId: 'evt-us-senate-2026',
    eventTitle: 'US Senate Control 2026',
    marketId: 'mkt-gop-senate',
    marketQuestion: 'Republicans Retain Majority',
    expiry: '2026-11-04T00:00:00Z',
    logoURI: 'https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg',
    yesPrice: 0.55,
    noPrice: 0.45,
    yesMint: 'MOCK_GOP_SENATE_YES',
    noMint: 'MOCK_GOP_SENATE_NO',
    symbolPrefix: 'GOP-SEN',
  },
];

function buildToken(
  event: EventDef,
  side: 'YES' | 'NO',
): JupiterToken {
  const isYes = side === 'YES';
  return {
    address: isYes ? event.yesMint : event.noMint,
    chainId: CHAIN_ID,
    decimals: 6,
    name: `${event.eventTitle} — ${side}`,
    symbol: `${event.symbolPrefix}-${side}`,
    logoURI: event.logoURI,
    tags: ['prediction', side.toLowerCase()],
    isVerified: false,
    source: 'dflow',
    isMock: true,
    price: isYes ? event.yesPrice : event.noPrice,
    predictionMeta: {
      eventId: event.eventId,
      eventTitle: event.eventTitle,
      marketId: event.marketId,
      marketQuestion: event.marketQuestion,
      side,
      expiry: event.expiry,
    },
  };
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
  // optional
  { symbol: "PPLTr", name: "Platinum (PPLTr)", mint: "EtTQ2QRyf33bd6B2uk7nm1nkinrdGKza66EGdjEY4s7o" },
  { symbol: "PALLr", name: "Palladium (PALLr)", mint: "9eS6ZsnqNJGGKWq8LqZ95YJLZ219oDuJ1qjsLoKcQkmQ" },
] as const;


export async function fetchPredictionTokens(): Promise<JupiterToken[]> {
  const tokens: JupiterToken[] = [];
  for (const event of MOCK_EVENTS) {
    tokens.push(buildToken(event, 'YES'));
    tokens.push(buildToken(event, 'NO'));
  }
  return tokens;
}

export async function fetchStockTokens(): Promise<JupiterToken[]> {
  // 1) symbolで検索（x-api-key必須）
  const found: JupiterToken[] = [];

  for (const sym of XSTOCK_SYMBOLS) {
    const results = await JupiterService.searchTokens(sym);

    // 2) いちばんそれっぽいのを拾う（symbol一致優先）
    const best =
      results.find(t => t.symbol?.toLowerCase() === sym.toLowerCase()) ??
      results[0];

    if (best) {
      found.push({
        ...best,
        tags: Array.from(new Set([...(best.tags ?? []), "stock", "xstocks"])),
        source: "stock",
        isMock: false,
        // price は JupiterService.getPrices で上書きしてもOK
      });
    }
  }

  // 3) 価格もまとめて付けたいなら（mint IDs が必要）
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
    logoURI: "", // 取れない時は空でもOK（UI側でプレースホルダ推奨）
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
    // UIが落ちないように最低限返す
    return REMORA_METALS.map(fallbackToken);
  }
}
