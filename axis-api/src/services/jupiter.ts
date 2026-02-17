import { Bindings } from '../config/env';

export interface JupiterToken {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI: string;
  tags: string[];
  daily_volume?: number;
}

// メモリキャッシュ (Serverlessのウォームスタート間で共有される可能性あり)
let tokenListCache: JupiterToken[] | null = null;
let lastTokenListFetch = 0;
// 【修正】キャッシュ時間を1時間(3600000)から5分(300000)に短縮
const CACHE_TTL = 1000 * 60 * 5; 

const JUP_TOKEN_API_V2 = 'https://api.jup.ag/tokens/v2';
const JUP_PRICE_API_V2 = 'https://api.jup.ag/price/v2';
const SOLANA_TOKEN_LIST_API = 'https://token-list-api.solana.cloud/v1/list';

function buildHeaders(apiKey?: string): HeadersInit {
  const headers: HeadersInit = {};
  if (apiKey) headers['x-api-key'] = apiKey;
  return headers;
}

function normalizeToken(t: any): JupiterToken {
  return {
    address: t.address,
    chainId: 101,
    decimals: t.decimals ?? 9,
    name: t.name || 'Unknown',
    symbol: t.symbol || 'UNKNOWN',
    logoURI: t.logoURI || '',
    tags: t.tags || [],
    daily_volume: t.daily_volume,
  };
}

export const JupiterService = {
  /**
   * Verified トークンリストを取得（キャッシュ付き）
   * Jupiter Token API v2 /tag?query=verified
   */
  getTokens: async (apiKey?: string): Promise<JupiterToken[]> => {
    const now = Date.now();

    if (tokenListCache && (now - lastTokenListFetch < CACHE_TTL)) {
      return tokenListCache;
    }

    // Jupiter Token API v2 を試行
    try {
      console.log('Fetching verified token list from Jupiter v2...');
      // 制限を感じる場合、ここを '/tokens' にすれば全トークン取得可能ですが、
      // 数万件になりペイロードが巨大化するため、基本は verified 推奨です。
      // 鮮度は CACHE_TTL の短縮で対応します。
      const response = await fetch(
        `${JUP_TOKEN_API_V2}/tag?query=verified`,
        { headers: buildHeaders(apiKey) }
      );
      if (!response.ok) {
        throw new Error(`Jupiter v2 returned ${response.status}`);
      }

      const data: any[] = await response.json();
      const tokens = Array.isArray(data) ? data.map(normalizeToken) : [];

      tokenListCache = tokens;
      lastTokenListFetch = now;
      console.log(`Cached ${tokens.length} verified tokens from Jupiter v2`);
      return tokens;
    } catch (error) {
      console.warn('Jupiter v2 failed, trying Solana Token List fallback:', error);
    }

    // フォールバック: Solana Token List API
    try {
      const response = await fetch(SOLANA_TOKEN_LIST_API);
      if (!response.ok) {
        throw new Error(`Solana Token List returned ${response.status}`);
      }

      const data: any = await response.json();
      const content = data?.content;
      const tokens = Array.isArray(content) ? content.map(normalizeToken) : [];

      tokenListCache = tokens;
      lastTokenListFetch = now;
      console.log(`Cached ${tokens.length} tokens from Solana Token List (fallback)`);
      return tokens;
    } catch (fallbackError) {
      console.error('Solana Token List fallback also failed:', fallbackError);
      if (tokenListCache) return tokenListCache;
      throw fallbackError;
    }
  },

  /**
   * サーバーサイドトークン検索
   * Jupiter Token API v2 /search?query={q}
   */
  searchTokens: async (query: string, apiKey?: string): Promise<JupiterToken[]> => {
    if (!query || query.trim().length === 0) return [];

    const q = query.trim();

    // Jupiter v2 検索を試行 (Unverified もヒットします)
    try {
      const url = `${JUP_TOKEN_API_V2}/search?query=${encodeURIComponent(q)}`;
      const response = await fetch(url, { headers: buildHeaders(apiKey) });
      if (!response.ok) throw new Error(`Search returned ${response.status}`);

      const data: any[] = await response.json();
      const tokens = Array.isArray(data) ? data.map(normalizeToken) : [];
      if (tokens.length > 0) return tokens;
    } catch {
      // フォールバックへ
    }

    // フォールバック: キャッシュ済みトークンリストからローカル検索
    if (tokenListCache) {
      const lower = q.toLowerCase();
      return tokenListCache.filter(t =>
        t.symbol.toLowerCase().includes(lower) ||
        t.name.toLowerCase().includes(lower) ||
        t.address === q
      ).slice(0, 20);
    }

    return [];
  },

  /**
   * トレンドトークン取得
   * Jupiter Token API v2 /{category}/{interval}
   */
  getTrending: async (
    category: 'toporganicscore' | 'toptraded' | 'toptrending',
    interval: '5m' | '1h' | '6h' | '24h',
    limit: number,
    apiKey?: string
  ): Promise<JupiterToken[]> => {
    try {
      const url = `${JUP_TOKEN_API_V2}/${category}/${interval}?limit=${Math.min(limit, 100)}`;
      const response = await fetch(url, { headers: buildHeaders(apiKey) });
      if (!response.ok) return [];

      const data: any[] = await response.json();
      return Array.isArray(data) ? data.map(normalizeToken) : [];
    } catch {
      return [];
    }
  },

  /**
   * 価格を取得（Jupiter Price API v2）
   */
  getPrices: async (ids: string[], apiKey?: string): Promise<Record<string, number>> => {
    if (ids.length === 0) return {};

    const idsParam = ids.join(',');
    const url = `${JUP_PRICE_API_V2}?ids=${idsParam}`;

    try {
      const response = await fetch(url, { headers: buildHeaders(apiKey) });

      if (!response.ok) {
        console.error(`Jupiter Price API Error: ${response.status} ${response.statusText}`);
        return {};
      }

      const data: any = await response.json();
      const prices: Record<string, number> = {};

      if (data && data.data) {
        Object.keys(data.data).forEach(key => {
          const item = data.data[key];
          if (item && item.price) {
            prices[key] = parseFloat(item.price);
          }
        });
      }

      return prices;
    } catch (error) {
      console.error('Jupiter Price Fetch Error:', error);
      return {};
    }
  }
};