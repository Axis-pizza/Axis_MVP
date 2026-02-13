import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { api } from "./api"; // 既存のAPIクライアント（axiosインスタンスなど）

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
  balance?: number;
  source?: string;
  dailyVolume?: number;
  marketCap?: number;
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

// フォールバック用の最低限のリスト
const CRITICAL_FALLBACK: JupiterToken[] = [
  { address: "So11111111111111111111111111111111111111112", chainId: 101, decimals: 9, name: "Wrapped SOL", symbol: "SOL", logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png", tags: ["verified"], isVerified: true },
  { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chainId: 101, decimals: 6, name: "USD Coin", symbol: "USDC", logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png", tags: ["verified"], isVerified: true },
];

// クライアント側でのメモリキャッシュ
let liteCache: JupiterToken[] | null = null;
let pendingListPromise: Promise<JupiterToken[]> | null = null;

export const JupiterService = {
  // バックエンド経由でリスト取得 (BFF)
  getLiteList: async (): Promise<JupiterToken[]> => {
    if (liteCache) return liteCache;
    if (pendingListPromise) return pendingListPromise;

    pendingListPromise = (async () => {
      try {
        console.log("Fetching tokens via Axis API...");
        // 独自のAPIエンドポイントを叩く
        const response = await api.get('/jupiter/tokens');
        
        if (response && response.tokens && Array.isArray(response.tokens)) {
          // Derive isVerified from tags if not already set
          const tokens: JupiterToken[] = response.tokens.map((t: JupiterToken) => ({
            ...t,
            isVerified: t.isVerified ?? (Array.isArray(t.tags) && t.tags.includes('verified')),
          }));
          liteCache = tokens;
          return tokens;
        }
        throw new Error('Invalid token list format');
      } catch (e) {
        console.warn("Axis API token list fetch failed, using fallback", e);
        return CRITICAL_FALLBACK;
      }
    })();

    try {
      return await pendingListPromise;
    } finally {
      pendingListPromise = null;
    }
  },

  // 動的トレンド取得 (DexScreenerは直接叩いてもOKだが、隠蔽するならサーバー側へ)
  // 今回は一旦そのまま、もしくはサーバー側で実装済みなら差し替え
  getTrendingTokens: async (): Promise<string[]> => {
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=solana`);
      if (!res.ok) return [];
      const data = await res.json();
      if (data.pairs) {
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

  // バックエンド経由で価格取得
  getPrices: async (mintAddresses: string[]): Promise<Record<string, number>> => {
    const validMints = mintAddresses.filter(m => m && m.length > 30);
    if (validMints.length === 0) return {};

    try {
      const idsParam = validMints.join(',');
      const response = await api.get(`/jupiter/prices?ids=${idsParam}`);
      
      if (response && response.prices) {
        return response.prices;
      }
      return {};
    } catch (e) {
      console.error("Axis API price fetch failed:", e);
      return {};
    }
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
    } catch {
      return [];
    }
  }
};