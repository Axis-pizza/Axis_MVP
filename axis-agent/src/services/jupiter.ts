import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export interface JupiterToken {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI: string;
  tags: string[];
  isVerified?: boolean;
  price?: number;
  balance?: number; // ウォレット残高
  source?: string;
  dailyVolume?: number;
  isMock?: boolean;
  predictionMeta?: {
    eventId: string;
    eventTitle: string;
    marketId: string;
    marketQuestion: string;
    side: 'YES' | 'NO';
    expiry: string;
  };
}

const UTL_API_URL = "https://token-list-api.solana.cloud/v1/list";
const DEX_TOKENS_API = "https://api.dexscreener.com/latest/dex/tokens";
const DEX_SEARCH_API = "https://api.dexscreener.com/latest/dex/search";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
const DFLOW_PROXY_API = `${API_BASE}/api/dflow/markets`;


// 緊急用フォールバック
const CRITICAL_FALLBACK: JupiterToken[] = [
  { address: "So11111111111111111111111111111111111111112", chainId: 101, decimals: 9, name: "Wrapped SOL", symbol: "SOL", logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png", tags: ["verified"], isVerified: true },
  { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chainId: 101, decimals: 6, name: "USD Coin", symbol: "USDC", logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png", tags: ["verified"], isVerified: true },
  { address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", chainId: 101, decimals: 6, name: "USDT", symbol: "USDT", logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png", tags: ["verified"], isVerified: true },
];

const CACHE_KEY = "utl_tokens_v2";
const CACHE_TTL = 1000 * 60 * 60 * 12; // 12時間

let liteCache: JupiterToken[] | null = null;
let refreshPromise: Promise<void> | null = null;
const priceCache: Record<string, { price: number; timestamp: number }> = {};

function mapUtlToken(t: any): JupiterToken {
  return {
    address: t.address,
    chainId: t.chainId,
    decimals: t.decimals,
    name: t.name,
    symbol: t.symbol,
    logoURI: t.logoURI,
    tags: t.tags || [],
    isVerified: t.verified ?? true,
  };
}

export const JupiterService = {
  // リスト取得 (UTL)
  getLiteList: async (): Promise<JupiterToken[]> => {
    if (liteCache) return liteCache;

    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { tokens, ts } = JSON.parse(raw);
        if (ts && Date.now() - ts < CACHE_TTL) {
          liteCache = tokens;
          if (!refreshPromise) refreshPromise = JupiterService.fetchAndCache();
          return tokens;
        }
      }
    } catch {}

    if (!refreshPromise) refreshPromise = JupiterService.fetchAndCache();
    await refreshPromise;
    return liteCache || CRITICAL_FALLBACK;
  },

  fetchAndCache: async () => {
    try {
      const res = await fetch(UTL_API_URL);
      if (!res.ok) throw new Error("UTL API Error");
      const data = await res.json();
      const content = data.content || data;
      const list = Array.isArray(content) 
        ? content.filter((t: any) => t.chainId === 101).map(mapUtlToken) 
        : CRITICAL_FALLBACK;
      
      if (list.length > 0) {
        liteCache = list;
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ tokens: list, ts: Date.now() }));
        } catch {} // Quota exceeded対策
      }
    } catch (e) {
      console.warn("UTL Fetch failed", e);
      liteCache = CRITICAL_FALLBACK;
    }
  },

  // 動的トレンド取得 (DexScreener)
  getTrendingTokens: async (): Promise<string[]> => {
    try {
      // Solanaの直近24hボリューム上位などを検索
      const res = await fetch(`${DEX_SEARCH_API}?q=solana`);
      if (!res.ok) return [];
      const data = await res.json();
      if (data.pairs) {
        // chainIdがsolanaのペアからBaseTokenのアドレスを抽出して重複排除
        const mints = data.pairs
            .filter((p: any) => p.chainId === 'solana')
            .map((p: any) => p.baseToken.address);
        return Array.from(new Set(mints)) as string[];
      }
      return [];
    } catch {
      return [];
    }
  },

  // 価格取得
  getPrices: async (mintAddresses: string[]): Promise<Record<string, number>> => {
    const validMints = mintAddresses.filter(m => m && m.length > 30);
    if (validMints.length === 0) return {};

    const now = Date.now();
    const uncached = validMints.filter(m => !priceCache[m] || (now - priceCache[m].timestamp > 60000));

    if (uncached.length === 0) {
      return validMints.reduce((acc, m) => {
        if (priceCache[m]) acc[m] = priceCache[m].price;
        return acc;
      }, {} as Record<string, number>);
    }

    const chunkSize = 30; // DexScreener limit
    const chunks = [];
    for (let i = 0; i < uncached.length; i += chunkSize) {
      chunks.push(uncached.slice(i, i + chunkSize));
    }

    await Promise.all(chunks.map(async (chunk) => {
      try {
        const res = await fetch(`${DEX_TOKENS_API}/${chunk.join(",")}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.pairs) {
          chunk.forEach(mint => {
            const pair = data.pairs.find((p: any) => p.baseToken.address === mint);
            if (pair && pair.priceUsd) {
              priceCache[mint] = { price: parseFloat(pair.priceUsd), timestamp: now };
            }
          });
        }
      } catch {}
    }));

    return validMints.reduce((acc, m) => {
      if (priceCache[m]) acc[m] = priceCache[m].price;
      return acc;
    }, {} as Record<string, number>);
  },
  
  searchTokens: async (query: string): Promise<JupiterToken[]> => {
    const q = query.trim().toLowerCase();
    const list = await JupiterService.getLiteList();
    if (!q) return [];
    if (q.length > 30) {
        const match = list.find(t => t.address === q);
        return match ? [match] : [];
    }
    return list.filter(t => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)).slice(0, 50);
  },

  getToken: async (mint: string): Promise<JupiterToken | null> => {
    const list = await JupiterService.getLiteList();
    return list.find(t => t.address === mint) ?? null;
  },

  getFallbackTokens: () => CRITICAL_FALLBACK,
};

export const WalletService = {
  getUserTokens: async (connection: Connection, walletPublicKey: PublicKey): Promise<JupiterToken[]> => {
    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPublicKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      const heldTokens = tokenAccounts.value
        .map((account) => ({
          mint: account.account.data.parsed.info.mint as string,
          amount: account.account.data.parsed.info.tokenAmount.uiAmount as number
        }))
        .filter((t) => t.amount > 0);

      const solBalance = await connection.getBalance(walletPublicKey);
      if (solBalance > 0) {
        heldTokens.push({ mint: "So11111111111111111111111111111111111111112", amount: solBalance / 1e9 });
      }

      const allTokens = await JupiterService.getLiteList();
      
      const result = heldTokens.map((held) => {
        const meta = allTokens.find(t => t.address === held.mint);
        if (meta) {
          return { ...meta, balance: held.amount };
        } else {
          return {
            address: held.mint,
            chainId: 101,
            decimals: 0,
            name: "Unknown",
            symbol: "UNKNOWN",
            logoURI: "",
            tags: ["unknown"],
            isVerified: false,
            balance: held.amount
          };
        }
      });

      return result.sort((a, b) => (b.balance || 0) - (a.balance || 0));
    } catch (e) {
      console.error("Wallet fetch error", e);
      return [];
    }
  }
};