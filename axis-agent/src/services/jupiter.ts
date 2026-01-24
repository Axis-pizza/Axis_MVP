/**
 * Jupiter Token Service (Fast UX Edition)
 * 起動時に全件取得しない。軽量リスト + 検索オンデマンド。
 */

export interface JupiterToken {
    address: string;
    chainId: number;
    decimals: number;
    name: string;
    symbol: string;
    logoURI: string;
    tags: string[];
  }
  
  const CHAIN_ID = 101;
  
  // ✅ 起動時に取るのは軽量データだけ（例：直近1hのトップトレード）
  const LITE_LIST_URL = "https://api.jup.ag/tokens/v2/toptraded/1h?limit=80";
  
  // ✅ 検索はオンデマンド
  const SEARCH_URL = "https://api.jup.ag/tokens/v2/search";
  
  const PRICE_API_URL = "https://api.jup.ag/price/v3";
  
  // --- Critical Fallback (Offline) ---
  const CRITICAL_FALLBACK: JupiterToken[] = [
    { address: "So11111111111111111111111111111111111111112", chainId: 101, decimals: 9, name: "Wrapped SOL", symbol: "SOL", logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png", tags: ["verified"] },
    { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chainId: 101, decimals: 6, name: "USD Coin", symbol: "USDC", logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png", tags: ["verified"] },
    { address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", chainId: 101, decimals: 6, name: "USDT", symbol: "USDT", logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png", tags: ["verified"] },
    { address: "JUPyiwrYJFskUPiHa7hkeR8VUtqVomfEtMEKyLb6XR3", chainId: 101, decimals: 6, name: "Jupiter", symbol: "JUP", logoURI: "https://static.jup.ag/jup/icon.png", tags: ["verified"] },
  ];
  
  // --- Cache (SWR) ---
  const CACHE_KEY = "jup_lite_tokens_v1";
  const CACHE_TTL = 1000 * 60 * 60 * 12; // 12h
  
  let liteCache: JupiterToken[] | null = null;
  let refreshPromise: Promise<void> | null = null;
  
  function loadLocalCache(): JupiterToken[] | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { tokens } = JSON.parse(raw);
      return Array.isArray(tokens) ? tokens : null;
    } catch {
      return null;
    }
  }
  
  function saveLocalCache(tokens: JupiterToken[]) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ tokens, ts: Date.now() }));
    } catch {}
  }
  
  function mapJupToken(t: any): JupiterToken {
    return {
      address: t.id,
      chainId: CHAIN_ID,
      decimals: t.decimals,
      name: t.name,
      symbol: t.symbol,
      logoURI: t.icon || "",
      tags: t.tags || [],
    };
  }
  
  async function fetchLiteList(): Promise<JupiterToken[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
  
    try {
      const apiKey = import.meta.env.VITE_JUPITER_API_KEY;
      const headers: HeadersInit = { Accept: "application/json" };
      if (apiKey) headers["x-api-key"] = apiKey;
  
      const res = await fetch(LITE_LIST_URL, { headers, signal: controller.signal });
      if (!res.ok) throw new Error(`LiteList HTTP ${res.status}`);
  
      const data = await res.json();
      const list = Array.isArray(data) ? data.map(mapJupToken) : [];
  
      return list.length ? list : CRITICAL_FALLBACK;
    } finally {
      clearTimeout(timer);
    }
  }
  
  // --- Price Cache ---
  const priceCache: Record<string, { price: number; timestamp: number }> = {};
  const PRICE_CACHE_DURATION = 30 * 1000;
  
  export const JupiterService = {
    /**
     * ✅ 起動用：軽量トークンリスト（即返し + 裏更新）
     */
    getLiteList: async (): Promise<JupiterToken[]> => {
      // 1) メモリキャッシュ
      if (liteCache?.length) return liteCache;
      console.log("Fetching Lite List from:", LITE_LIST_URL);
  
      // 2) localStorage を即返し（体感最速）
      const local = loadLocalCache();
      if (local?.length) {
        liteCache = local;
  
        // 裏で更新（SWR）
        if (!refreshPromise) {
          refreshPromise = (async () => {
            try {
              const fresh = await fetchLiteList();
              liteCache = fresh;
              saveLocalCache(fresh);
            } finally {
              refreshPromise = null;
            }
          })();
        }
  
        return local;
      }
  
      // 3) 何もなければ fallback を即返し + 裏更新
      liteCache = CRITICAL_FALLBACK;
  
      refreshPromise = (async () => {
        try {
          const fresh = await fetchLiteList();
          liteCache = fresh;
          saveLocalCache(fresh);
        } finally {
          refreshPromise = null;
        }
      })();
  
      return CRITICAL_FALLBACK;
    },
  
    /**
     * ✅ 検索用：ユーザー入力時だけ叩く（全件保持しない）
     */
    searchTokens: async (query: string): Promise<JupiterToken[]> => {
      const q = query.trim();
      if (!q) return [];
  
      const apiKey = import.meta.env.VITE_JUPITER_API_KEY;
      const headers: HeadersInit = { Accept: "application/json" };
      if (apiKey) headers["x-api-key"] = apiKey;
  
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
  
      try {
        const res = await fetch(`${SEARCH_URL}?query=${encodeURIComponent(q)}`, {
          headers,
          signal: controller.signal,
        });
        if (!res.ok) return [];
  
        const data = await res.json();
        return Array.isArray(data) ? data.map(mapJupToken) : [];
      } finally {
        clearTimeout(timer);
      }
    },
  
    /**
     * ✅ Prices（あなたのままでOK）
     */
    getPrices: async (mintAddresses: string[]): Promise<Record<string, number>> => {
      if (mintAddresses.length === 0) return {};
  
      const now = Date.now();
      const uncachedMints = mintAddresses.filter((mint) => {
        const cached = priceCache[mint];
        return !cached || now - cached.timestamp > PRICE_CACHE_DURATION;
      });
  
      if (uncachedMints.length === 0) {
        return mintAddresses.reduce((acc, mint) => {
          acc[mint] = priceCache[mint].price;
          return acc;
        }, {} as Record<string, number>);
      }
  
      try {
        const ids = uncachedMints.join(",");
        const apiKey = import.meta.env.VITE_JUPITER_API_KEY;
  
        const headers: HeadersInit = { Accept: "application/json" };
        if (apiKey) headers["x-api-key"] = apiKey;
  
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
  
        const response = await fetch(`${PRICE_API_URL}?ids=${ids}`, { headers, signal: controller.signal });
        clearTimeout(timer);
  
        const data = await response.json();
        const result: Record<string, number> = {};
  
        if (data.data) {
          Object.entries(data.data).forEach(([mint, info]: [string, any]) => {
            const price = parseFloat(info.price);
            if (!isNaN(price)) {
              priceCache[mint] = { price, timestamp: now };
              result[mint] = price;
            }
          });
        }
  
        // 欠けた分はキャッシュから埋める
        mintAddresses.forEach((mint) => {
          if (priceCache[mint]) result[mint] = priceCache[mint].price;
        });
  
        return result;
      } catch {
        return mintAddresses.reduce((acc, mint) => {
          if (priceCache[mint]) acc[mint] = priceCache[mint].price;
          return acc;
        }, {} as Record<string, number>);
      }
    },
  };
  