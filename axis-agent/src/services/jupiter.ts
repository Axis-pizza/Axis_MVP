import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { api } from './api';

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

// Minimum fallback token list
const CRITICAL_FALLBACK: JupiterToken[] = [
  {
    address: 'So11111111111111111111111111111111111111112',
    chainId: 101,
    decimals: 9,
    name: 'Wrapped SOL',
    symbol: 'SOL',
    logoURI:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    tags: ['verified'],
    isVerified: true,
  },
  {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    chainId: 101,
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC',
    logoURI:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    tags: ['verified'],
    isVerified: true,
  },
];

// Client-side memory cache
let liteCache: JupiterToken[] | null = null;
let pendingListPromise: Promise<JupiterToken[]> | null = null;

export const JupiterService = {
  // Fetch token list via backend (BFF)
  getLiteList: async (): Promise<JupiterToken[]> => {
    if (liteCache) return liteCache;
    if (pendingListPromise) return pendingListPromise;

    pendingListPromise = (async () => {
      try {
        console.log('Fetching tokens via Axis API...');
        // Call our own API endpoint
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
        console.warn('Axis API token list fetch failed, using fallback', e);
        return CRITICAL_FALLBACK;
      }
    })();

    try {
      return await pendingListPromise;
    } finally {
      pendingListPromise = null;
    }
  },

  // Fetch trending tokens via BFF (Jupiter v2 API)
  getTrendingTokens: async (): Promise<JupiterToken[]> => {
    try {
      const response = await api.get(
        '/jupiter/trending?category=toptrending&interval=24h&limit=50'
      );
      if (response && response.tokens && Array.isArray(response.tokens)) {
        return response.tokens.map((t: JupiterToken) => ({
          ...t,
          isVerified: t.isVerified ?? (Array.isArray(t.tags) && t.tags.includes('verified')),
        }));
      }
      return [];
    } catch {
      // DexScreener fallback
      try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=solana`);
        if (!res.ok) return [];
        const data = await res.json();
        if (data.pairs) {
          const mints = data.pairs
            .filter((p: any) => p.chainId === 'solana')
            .map((p: any) => p.baseToken.address);
          const uniqueMints = Array.from(new Set(mints)) as string[];
          // Convert mint addresses to JupiterToken objects using cache
          const list = liteCache || [];
          return uniqueMints
            .map((m) => list.find((t) => t.address === m))
            .filter((t): t is JupiterToken => t !== undefined);
        }
        return [];
      } catch {
        return [];
      }
    }
  },

  // Fetch prices via backend
  getPrices: async (mintAddresses: string[]): Promise<Record<string, number>> => {
    const validMints = mintAddresses.filter((m) => m && m.length > 30);
    if (validMints.length === 0) return {};

    try {
      const idsParam = validMints.join(',');
      const response = await api.get(`/jupiter/prices?ids=${idsParam}`);

      if (response && response.prices) {
        return response.prices;
      }
      return {};
    } catch (e) {
      console.error('Axis API price fetch failed:', e);
      return {};
    }
  },

  // Server-side search via BFF (Jupiter v2 API)
  searchTokens: async (query: string): Promise<JupiterToken[]> => {
    const q = query.trim();
    if (!q) return [];

    // CA (Contract Address) lookup: cache → fetchTokenByMint fallback
    if (q.length > 30) {
      const lowerQ = q.toLowerCase();
      if (liteCache) {
        const match = liteCache.find(
          (t) => t.address === lowerQ || t.address.toLowerCase() === lowerQ
        );
        if (match) return [match];
      }
      const fetched = await JupiterService.fetchTokenByMint(q);
      return fetched ? [fetched] : [];
    }

    // Symbol/name search: BFF server-side search
    try {
      const response = await api.get(`/jupiter/search?q=${encodeURIComponent(q)}`);
      if (response && response.tokens && Array.isArray(response.tokens)) {
        return response.tokens.map((t: JupiterToken) => ({
          ...t,
          isVerified: t.isVerified ?? (Array.isArray(t.tags) && t.tags.includes('verified')),
        }));
      }
      return [];
    } catch {
      // Fallback to client-side filtering if BFF search fails
      const list = await JupiterService.getLiteList();
      const lowerQ = q.toLowerCase();
      return list
        .filter(
          (t) => t.symbol.toLowerCase().includes(lowerQ) || t.name.toLowerCase().includes(lowerQ)
        )
        .slice(0, 50);
    }
  },

  getToken: async (mint: string): Promise<JupiterToken | null> => {
    const list = await JupiterService.getLiteList();
    const cached = list.find((t) => t.address === mint);
    if (cached) return cached;
    return JupiterService.fetchTokenByMint(mint);
  },

  /**
   * Fetch a single token by mint address from Jupiter API.
   * Used as fallback when token is not in the cached list.
   */
  fetchTokenByMint: async (mint: string): Promise<JupiterToken | null> => {
    try {
      const res = await fetch(`https://lite-api.jup.ag/tokens/v1/${mint}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data.address) return null;
      const token: JupiterToken = {
        address: data.address,
        chainId: 101,
        decimals: data.decimals ?? 9,
        name: data.name || 'Unknown',
        symbol: data.symbol || 'UNKNOWN',
        logoURI: data.logoURI || '',
        tags: data.tags || [],
        isVerified: Array.isArray(data.tags) && data.tags.includes('verified'),
      };
      // Add to cache for future lookups
      if (liteCache && !liteCache.find((t) => t.address === token.address)) {
        liteCache.push(token);
      }
      return token;
    } catch {
      return null;
    }
  },

  getFallbackTokens: () => CRITICAL_FALLBACK,
};

export const WalletService = {
  getUserTokens: async (
    connection: Connection,
    walletPublicKey: PublicKey
  ): Promise<JupiterToken[]> => {
    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPublicKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      const heldTokens = tokenAccounts.value
        .map((account) => ({
          mint: account.account.data.parsed.info.mint as string,
          amount: account.account.data.parsed.info.tokenAmount.uiAmount as number,
        }))
        .filter((t) => t.amount > 0);

      const solBalance = await connection.getBalance(walletPublicKey);
      if (solBalance > 0) {
        heldTokens.push({
          mint: 'So11111111111111111111111111111111111111112',
          amount: solBalance / 1e9,
        });
      }

      const allTokens = await JupiterService.getLiteList();

      const result = heldTokens.map((held) => {
        const meta = allTokens.find((t) => t.address === held.mint);
        if (meta) {
          return { ...meta, balance: held.amount };
        } else {
          return {
            address: held.mint,
            chainId: 101,
            decimals: 0,
            name: 'Unknown',
            symbol: 'UNKNOWN',
            logoURI: '',
            tags: ['unknown'],
            isVerified: false,
            balance: held.amount,
          };
        }
      });

      return result.sort((a, b) => (b.balance || 0) - (a.balance || 0));
    } catch {
      return [];
    }
  },
};
