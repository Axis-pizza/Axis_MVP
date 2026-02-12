/**
 * GeckoTerminal Service
 * Provides OHLCV data for charts via GeckoTerminal Public API
 */

const BASE_URL = 'https://api.geckoterminal.com/api/v2/networks/solana';

export const GeckoTerminalService = {
  /**
   * Get OHLCV data for a token (via its top pool)
   * @param tokenAddress Mint address of the token
   * @param timeframe 'day' | 'hour' | 'minute'
   */
  getOHLCV: async (tokenAddress: string, timeframe: 'day' | 'hour' | 'minute' = 'day') => {
    try {
      // 1. Get Top Pool for the token
      const poolsRes = await fetch(`${BASE_URL}/tokens/${tokenAddress}/pools?page=1&limit=1`);
      const poolsData = await poolsRes.json();
      
      if (!poolsData.data || poolsData.data.length === 0) {
        return [];
      }
      
      const poolAddress = poolsData.data[0].attributes.address;
      
      // 2. Fetch OHLCV for that pool
      // GeckoTerminal API: /pools/{pool_address}/ohlcv/{timeframe}
      const res = await fetch(`${BASE_URL}/pools/${poolAddress}/ohlcv/${timeframe}?limit=100`);
      const data = await res.json();
      
      if (!data.data || !data.data.attributes || !data.data.attributes.ohlcv_list) return [];

      // 3. Format for Lightweight Charts (RichChart)
      // Gecko Response format: [timestamp, open, high, low, close, volume]
      const formatted = data.data.attributes.ohlcv_list.map((item: number[]) => ({
        time: item[0], // Unix Timestamp (seconds)
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
      })).reverse(); // Oldest first for the chart

      return formatted;
    } catch {
      return [];
    }
  }
};