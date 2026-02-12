// axis-api/src/services/dflow.ts

// HTTPSのエンドポイントを使用
const DFLOW_API_BASE = "https://dev-prediction-markets-api.dflow.net";

export interface DFlowTokenInfo {
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

export class DFlowService {
  /**
   * アクティブな予測市場を取得し、トークンリスト形式に変換して返す
   */
  static async getActiveMarketTokens(): Promise<DFlowTokenInfo[]> {
    try {
      // ドキュメント推奨のパラメータ: nestedMarkets=true, status=active
      const url = `${DFLOW_API_BASE}/api/v1/events?withNestedMarkets=true&status=active&limit=100`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`DFlow API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const events = data.events || [];
      const tokens: DFlowTokenInfo[] = [];

      // 階層構造をフラットなトークンリストに変換
      for (const event of events) {
        if (!event.markets) continue;

        for (const market of event.markets) {
          // accountsはMap形式のオブジェクトになっている場合があるためObject.valuesで処理
          const accounts = market.accounts ? Object.values(market.accounts) : [];
          
          for (const account of accounts as any[]) {
             const eventImage = event.imageUrl || "";
             const expiry = market.expirationTime
               ? new Date(market.expirationTime * 1000).toISOString()
               : "";

             // YES Token
             if (account.yesMint) {
               tokens.push({
                 mint: account.yesMint,
                 symbol: "YES",
                 name: `YES: ${market.title}`,
                 image: eventImage,
                 side: 'YES',
                 eventId: event.ticker,
                 eventTitle: event.title,
                 marketId: market.ticker,
                 marketTitle: market.title,
                 expiry,
               });
             }

             // NO Token
             if (account.noMint) {
               tokens.push({
                 mint: account.noMint,
                 symbol: "NO",
                 name: `NO: ${market.title}`,
                 image: eventImage,
                 side: 'NO',
                 eventId: event.ticker,
                 eventTitle: event.title,
                 marketId: market.ticker,
                 marketTitle: market.title,
                 expiry,
               });
             }
          }
        }
      }

      return tokens;

    } catch (error) {
      console.error("Failed to fetch DFlow markets:", error);
      return [];
    }
  }

}