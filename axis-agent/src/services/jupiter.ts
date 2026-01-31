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

// ✅ APIキー不要の公式Strict List
const LITE_LIST_URL = "https://token.jup.ag/strict";
// ✅ バックアップ: 公式サイトがDNSエラー等で落ちている場合用
const BACKUP_LIST_URL = "https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json";

const SEARCH_URL = "https://api.jup.ag/tokens/v2/search";
const PRICE_API_URL = "https://api.jup.ag/price/v3";

// --- Critical Fallback (Offline) ---
const CRITICAL_FALLBACK: JupiterToken[] = [
  { address: "So11111111111111111111111111111111111111112", chainId: 101, decimals: 9, name: "Wrapped SOL", symbol: "SOL", logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png", tags: ["verified"] },
  { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chainId: 101, decimals: 6, name: "USD Coin", symbol: "USDC", logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png", tags: ["verified"] },
  { address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", chainId: 101, decimals: 6, name: "USDT", symbol: "USDT", logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png", tags: ["verified"] },
  { address: "JUPyiwrYJFskUPiHa7hkeR8VUtqVomfEtMEKyLb6XR3", chainId: 101, decimals: 6, name: "Jupiter", symbol: "JUP", logoURI: "https://static.jup.ag/jup/icon.png", tags: ["verified"] },
  { 
    // Penguin Meme (前回のログから pump 付きのアドレスを推測)
    address: "8Jx8AAHj86wbQgUTjGuj6GTTL5Ps3cqxKRTvpaJApump", 
    chainId: 101, 
    decimals: 6, 
    name: "Nietzschean Penguin", 
    symbol: "PENGUIN", // 必要に応じて変更してください
    logoURI: "https://ipfs.io/ipfs/bafybeieukfwe5dz5m7d7pocyogm2sd3bzr6ajxefav7mcvpbf53yl3cn6u", // 適切な画像のURLがあれば差し替えてください
    tags: ["meme", "pump"] 
  },
  { 
    // White Whale
    address: "a3W4qutoEJA4232T2gwZUfgYJTetr96pU4SJMwppump", 
    chainId: 101, 
    decimals: 6, 
    name: "White Whale", 
    symbol: "WHITEWHALE", // 必要に応じて変更してください
    logoURI: "https://ipfs.io/ipfs/bafkreid36cgjpa6wm7rvczq2odx4i3y45cqj3nmq5fecxzsaetjumwxaqi", // 適切な画像のURLがあれば差し替えてください
    tags: ["meme", "pump"] 
  },
];

const CACHE_KEY = "jup_lite_tokens_v2_strict"; 
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
    address: t.id || t.address,
    chainId: CHAIN_ID,
    decimals: t.decimals,
    name: t.name,
    symbol: t.symbol,
    logoURI: t.icon || t.logoURI || "",
    tags: t.tags || [],
  };
}

// ✅ 修正: タイムアウトとバックアップ取得ロジックを追加
async function fetchLiteList(): Promise<JupiterToken[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000); 

  try {
    // 1. 本家 (token.jup.ag)
    const res = await fetch(LITE_LIST_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`LiteList HTTP ${res.status}`);

    const data = await res.json();
    const list = Array.isArray(data) ? data.map(mapJupToken) : [];
    return list.length ? list : CRITICAL_FALLBACK;

  } catch (e) {
    console.warn("Primary Token List Failed, trying backup...", e);

    // 2. バックアップ (GitHub) - ログにあったDNSエラー対策
    try {
        const resBackup = await fetch(BACKUP_LIST_URL);
        if (resBackup.ok) {
            const data = await resBackup.json();
            // 古い形式のJSONに対応 (data.tokens)
            const list = Array.isArray(data) ? data : (data.tokens || []);
            // 重すぎるので最初の500件だけ
            return list.slice(0, 500).map(mapJupToken);
        }
    } catch (backupErr) {
        console.warn("Backup List also failed", backupErr);
    }

    return CRITICAL_FALLBACK;
  } finally {
    clearTimeout(timer);
  }
}

const priceCache: Record<string, { price: number; timestamp: number }> = {};
const PRICE_CACHE_DURATION = 30 * 1000;

export const JupiterService = {
  getLiteList: async (): Promise<JupiterToken[]> => {
    if (liteCache?.length) return liteCache;

    const local = loadLocalCache();
    if (local?.length) {
      liteCache = local;
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

  searchTokens: async (query: string): Promise<JupiterToken[]> => {
    const q = query.trim();
    if (!q) return [];

    // API Keyがある場合はヘッダーに追加 (Viteのenvから取得)
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
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  },

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
  getFallbackTokens: (): JupiterToken[] => {
    return CRITICAL_FALLBACK;
  }
};