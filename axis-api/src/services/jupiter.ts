// Node.js環境(v18未満)でない限り、native fetchが使えるためimport不要ですが
// 型安全性のため必要であれば適宜調整してください。

export interface JupiterToken {
    address: string;
    chainId: number;
    decimals: number;
    name: string;
    symbol: string;
    logoURI: string;
    tags: string[];
  }
  
  // 簡易メモリキャッシュ (Serverlessのウォームスタート間で共有される可能性があります)
  let tokenListCache: JupiterToken[] | null = null;
  let lastTokenListFetch = 0;
  const CACHE_TTL = 1000 * 60 * 60; // 1時間
  
  const JUP_PRICE_API_V2 = 'https://api.jup.ag/price/v2';
  const TOKEN_LIST_API = 'https://token-list-api.solana.cloud/v1/list';
  
  export const JupiterService = {
    /**
     * トークンリストを取得（キャッシュ付き）
     * APIキーは不要
     */
    getTokens: async (): Promise<JupiterToken[]> => {
      const now = Date.now();
      
      // キャッシュが有効なら即座に返す
      if (tokenListCache && (now - lastTokenListFetch < CACHE_TTL)) {
        return tokenListCache;
      }
  
      try {
        console.log('Fetching fresh token list from Solana Token List API...');
        const response = await fetch(TOKEN_LIST_API);
        if (!response.ok) {
          throw new Error(`Failed to fetch token list: ${response.status}`);
        }
        
        const data: any = await response.json();
        // レスポンス構造の揺れに対応 (contentプロパティに入っている場合がある)
        const content = data.content || data;
        
        // Solana Mainnet (chainId: 101) のみをフィルタリング
        const solanaTokens = Array.isArray(content) 
          ? content.filter((t: any) => t.chainId === 101) 
          : [];
  
        // キャッシュ更新
        tokenListCache = solanaTokens;
        lastTokenListFetch = now;
        
        return solanaTokens;
      } catch (error) {
        console.error('Jupiter Token List Error:', error);
        // エラー時、もし古いキャッシュがあればそれを返す（フォールバック）
        if (tokenListCache) return tokenListCache;
        // キャッシュもなければ空配列を返さずエラーを投げるか、最小限のリストを返す
        throw error;
      }
    },
  
    /**
     * 価格を取得（Jupiter Price API v2）
     * @param ids - ミントアドレスの配列
     * @param apiKey - 環境変数から取得したAPIキー
     */
    getPrices: async (ids: string[], apiKey?: string): Promise<Record<string, number>> => {
      if (ids.length === 0) return {};
      
      // Jupiter Price API v2 はカンマ区切りでリクエスト
      const idsParam = ids.join(',');
      const url = `${JUP_PRICE_API_V2}?ids=${idsParam}`;
  
      // APIキーがあればヘッダーに付与 (Proプラン対応)
      const headers: HeadersInit = {};
      if (apiKey) {
          // v2のドキュメント等を確認し、適切なヘッダー名を使用してください。一般的には 'x-api-key' など
          // Jupiterの場合、URLパラメータ ?token=API_KEY のケースもあるため仕様要確認ですが、
          // 多くの場合 Enterprise/Pro はヘッダー認証をサポートします。
          // ここでは一般的な例として記載します。
          // headers['x-api-key'] = apiKey; 
      }
  
      try {
        const response = await fetch(url, { headers });
        
        // 429 Rate Limitなどのハンドリング
        if (!response.ok) {
          console.error(`Jupiter Price API Error: ${response.status} ${response.statusText}`);
          return {};
        }
        
        const data: any = await response.json();
        
        // レスポンス形式: { data: { "So11...": { id: "...", type: "...", price: "123.45" } } }
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