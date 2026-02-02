/**
 * Jupiter Token Service (2025 API V2 Edition)
 * 
 * ⚠️ 2025年10月以降、旧APIは廃止されました
 * - token.jup.ag → 廃止
 * - tokens.jup.ag → 廃止
 * - api.jup.ag/tokens/** → 廃止
 * 
 * ✅ 新API: lite-api.jup.ag を使用
 */

export interface JupiterToken {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI: string;
  tags: string[];
  isVerified?: boolean;
}

const CHAIN_ID = 101;

// ✅ 新しいAPIエンドポイント (2025年版)
const TOKEN_LIST_URL = "https://lite-api.jup.ag/tokens/v2/tag?query=verified";
const SEARCH_URL = "https://lite-api.jup.ag/tokens/v2/search";
const PRICE_API_URL = "https://lite-api.jup.ag/price/v3";

// バックアップ: Solana Token List (古いがまだ動く)
const BACKUP_LIST_URL = "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json";

// --- Critical Fallback (Offline) ---
const CRITICAL_FALLBACK: JupiterToken[] = [
  { address: "So11111111111111111111111111111111111111112", chainId: 101, decimals: 9, name: "Wrapped SOL", symbol: "SOL", logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png", tags: ["verified"], isVerified: true },
  { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chainId: 101, decimals: 6, name: "USD Coin", symbol: "USDC", logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png", tags: ["verified"], isVerified: true },
  { address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", chainId: 101, decimals: 6, name: "USDT", symbol: "USDT", logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png", tags: ["verified"], isVerified: true },
  { address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", chainId: 101, decimals: 6, name: "Jupiter", symbol: "JUP", logoURI: "https://static.jup.ag/jup/icon.png", tags: ["verified"], isVerified: true },
  { address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", chainId: 101, decimals: 5, name: "Bonk", symbol: "BONK", logoURI: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I", tags: ["verified"], isVerified: true },
  { address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", chainId: 101, decimals: 6, name: "dogwifhat", symbol: "WIF", logoURI: "https://bafkreibk3covs5ltyqxa272uodhculbr6kea6betidfwy3ajsav2vjzyum.ipfs.nftstorage.link", tags: ["verified"], isVerified: true },
  { address: "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4", chainId: 101, decimals: 6, name: "Jupiter Perps LP", symbol: "JLP", logoURI: "https://static.jup.ag/jlp/icon.png", tags: ["verified"], isVerified: true },
];

const CACHE_KEY = "jup_tokens_v3_lite"; // キャッシュキーを変更して古いキャッシュをクリア
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6時間

let liteCache: JupiterToken[] | null = null;
let refreshPromise: Promise<void> | null = null;

function loadLocalCache(): JupiterToken[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { tokens, ts } = JSON.parse(raw);
    
    // キャッシュの有効期限をチェック
    if (ts && Date.now() - ts > CACHE_TTL) {
      console.log("[Jupiter] Cache expired, will refresh");
      return null;
    }
    
    return Array.isArray(tokens) && tokens.length > 0 ? tokens : null;
  } catch {
    return null;
  }
}

function saveLocalCache(tokens: JupiterToken[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ tokens, ts: Date.now() }));
  } catch (e) {
    console.warn("[Jupiter] Failed to save cache:", e);
  }
}

/**
 * 古いキャッシュをクリアする
 */
function clearOldCache() {
  try {
    // 古いキャッシュキーを削除
    const oldKeys = ["jup_lite_tokens_v2_strict", "jup_lite_tokens", "jup_tokens_v2"];
    oldKeys.forEach(key => localStorage.removeItem(key));
  } catch {}
}

/**
 * Jupiter API V2のレスポンスをJupiterToken形式に変換
 */
function mapJupTokenV2(t: any): JupiterToken {
  return {
    address: t.id || t.address || t.mint,
    chainId: CHAIN_ID,
    decimals: t.decimals ?? 6,
    name: t.name || "Unknown",
    symbol: t.symbol || "???",
    logoURI: t.icon || t.logoURI || t.logo_uri || "",
    tags: t.tags || [],
    isVerified: t.isVerified ?? t.tags?.includes("verified") ?? false,
  };
}

/**
 * トークンリストを取得（新API対応）
 */
async function fetchTokenList(): Promise<JupiterToken[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    console.log("[Jupiter] Fetching token list from lite-api.jup.ag...");
    
    const res = await fetch(TOKEN_LIST_URL, { 
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    
    // API V2のレスポンス形式: 配列で返ってくる
    const list = Array.isArray(data) ? data.map(mapJupTokenV2) : [];
    
    console.log(`[Jupiter] Fetched ${list.length} verified tokens`);
    
    if (list.length > 0) {
      return list;
    }
    
    throw new Error("Empty token list received");

  } catch (e: any) {
    console.warn("[Jupiter] Primary API failed:", e.message);
    
    // バックアップ: jsdelivr経由のSolana Token List
    try {
      console.log("[Jupiter] Trying backup (jsdelivr)...");
      const resBackup = await fetch(BACKUP_LIST_URL, { signal: controller.signal });
      
      if (resBackup.ok) {
        const data = await resBackup.json();
        const tokens = data.tokens || [];
        // mainnet-betaのトークンのみ、最初の300件
        const filtered = tokens
          .filter((t: any) => t.chainId === 101)
          .slice(0, 300)
          .map(mapJupTokenV2);
        
        console.log(`[Jupiter] Backup loaded ${filtered.length} tokens`);
        return filtered.length > 0 ? filtered : CRITICAL_FALLBACK;
      }
    } catch (backupErr) {
      console.warn("[Jupiter] Backup also failed:", backupErr);
    }

    return CRITICAL_FALLBACK;
  } finally {
    clearTimeout(timer);
  }
}

const priceCache: Record<string, { price: number; timestamp: number }> = {};
const PRICE_CACHE_DURATION = 30 * 1000;

export const JupiterService = {
  /**
   * キャッシュをクリアして再取得
   */
  clearCache: () => {
    liteCache = null;
    clearOldCache();
    localStorage.removeItem(CACHE_KEY);
    console.log("[Jupiter] Cache cleared");
  },

  /**
   * トークンリストを取得
   */
  getLiteList: async (): Promise<JupiterToken[]> => {
    // 古いキャッシュをクリア（初回のみ）
    clearOldCache();
    
    // メモリキャッシュがあればそれを返す
    if (liteCache && liteCache.length > 0) {
      return liteCache;
    }

    // ローカルストレージからロード
    const local = loadLocalCache();
    if (local && local.length > 0) {
      liteCache = local;
      
      // バックグラウンドで更新
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const fresh = await fetchTokenList();
            if (fresh.length > CRITICAL_FALLBACK.length) {
              liteCache = fresh;
              saveLocalCache(fresh);
            }
          } catch (e) {
            console.warn("[Jupiter] Background refresh failed:", e);
          } finally {
            refreshPromise = null;
          }
        })();
      }
      
      return local;
    }

    // キャッシュがない場合は即座にフォールバックを返し、バックグラウンドで取得
    liteCache = CRITICAL_FALLBACK;
    
    refreshPromise = (async () => {
      try {
        const fresh = await fetchTokenList();
        if (fresh.length > CRITICAL_FALLBACK.length) {
          liteCache = fresh;
          saveLocalCache(fresh);
        }
      } catch (e) {
        console.warn("[Jupiter] Initial fetch failed:", e);
      } finally {
        refreshPromise = null;
      }
    })();

    return CRITICAL_FALLBACK;
  },

  /**
   * トークン検索（新API対応）
   */
  searchTokens: async (query: string): Promise<JupiterToken[]> => {
    const q = query.trim();
    if (!q) return [];

    // 短いクエリはローカルフィルタリング
    if (q.length < 2) {
      const list = await JupiterService.getLiteList();
      const lower = q.toLowerCase();
      return list.filter(t => 
        t.symbol.toLowerCase().startsWith(lower) || 
        t.name.toLowerCase().startsWith(lower)
      ).slice(0, 20);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      // API Keyがある場合はヘッダーに追加
      const apiKey = typeof import.meta !== 'undefined' 
        ? import.meta.env?.VITE_JUPITER_API_KEY 
        : undefined;
      
      const headers: HeadersInit = { "Accept": "application/json" };
      if (apiKey) headers["x-api-key"] = apiKey;

      const url = `${SEARCH_URL}?query=${encodeURIComponent(q)}`;
      console.log("[Jupiter] Searching:", url);
      
      const res = await fetch(url, { headers, signal: controller.signal });
      
      if (!res.ok) {
        console.warn(`[Jupiter] Search API error: ${res.status}`);
        // APIがエラーの場合はローカル検索にフォールバック
        const list = await JupiterService.getLiteList();
        const lower = q.toLowerCase();
        return list.filter(t => 
          t.symbol.toLowerCase().includes(lower) || 
          t.name.toLowerCase().includes(lower) ||
          t.address === q
        ).slice(0, 30);
      }

      const data = await res.json();
      const results = Array.isArray(data) ? data.map(mapJupTokenV2) : [];
      
      console.log(`[Jupiter] Search found ${results.length} results for "${q}"`);
      return results;
      
    } catch (e) {
      console.warn("[Jupiter] Search failed, using local filter:", e);
      
      // フォールバック: ローカルリストでフィルタ
      const list = await JupiterService.getLiteList();
      const lower = q.toLowerCase();
      return list.filter(t => 
        t.symbol.toLowerCase().includes(lower) || 
        t.name.toLowerCase().includes(lower) ||
        t.address === q
      ).slice(0, 30);
    } finally {
      clearTimeout(timer);
    }
  },

  /**
   * 価格取得（新API対応）
   */
  getPrices: async (mintAddresses: string[]): Promise<Record<string, number>> => {
    if (mintAddresses.length === 0) return {};

    const now = Date.now();
    const uncachedMints = mintAddresses.filter((mint) => {
      const cached = priceCache[mint];
      return !cached || now - cached.timestamp > PRICE_CACHE_DURATION;
    });

    // 全てキャッシュにある場合
    if (uncachedMints.length === 0) {
      return mintAddresses.reduce((acc, mint) => {
        if (priceCache[mint]) acc[mint] = priceCache[mint].price;
        return acc;
      }, {} as Record<string, number>);
    }

    try {
      const ids = uncachedMints.join(",");
      const apiKey = typeof import.meta !== 'undefined' 
        ? import.meta.env?.VITE_JUPITER_API_KEY 
        : undefined;

      const headers: HeadersInit = { "Accept": "application/json" };
      if (apiKey) headers["x-api-key"] = apiKey;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${PRICE_API_URL}?ids=${ids}`, { 
        headers, 
        signal: controller.signal 
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Price API HTTP ${response.status}`);
      }

      const data = await response.json();
      const result: Record<string, number> = {};

      // V3 API のレスポンス形式
      if (data.data) {
        Object.entries(data.data).forEach(([mint, info]: [string, any]) => {
          const price = parseFloat(info.price);
          if (!isNaN(price)) {
            priceCache[mint] = { price, timestamp: now };
            result[mint] = price;
          }
        });
      }

      // キャッシュ済みのものも含める
      mintAddresses.forEach((mint) => {
        if (priceCache[mint] && !(mint in result)) {
          result[mint] = priceCache[mint].price;
        }
      });

      return result;
    } catch (e) {
      console.warn("[Jupiter] Price fetch failed:", e);
      
      // キャッシュがあればそれを返す
      return mintAddresses.reduce((acc, mint) => {
        if (priceCache[mint]) acc[mint] = priceCache[mint].price;
        return acc;
      }, {} as Record<string, number>);
    }
  },

  /**
   * フォールバックトークンを取得
   */
  getFallbackTokens: (): JupiterToken[] => {
    return CRITICAL_FALLBACK;
  },
  
  /**
   * 単一トークンの情報を取得
   */
  getToken: async (mintAddress: string): Promise<JupiterToken | null> => {
    // まずキャッシュから探す
    const list = await JupiterService.getLiteList();
    const found = list.find(t => t.address === mintAddress);
    if (found) return found;
    
    // 見つからなければ検索
    const results = await JupiterService.searchTokens(mintAddress);
    return results.find(t => t.address === mintAddress) || null;
  }
};