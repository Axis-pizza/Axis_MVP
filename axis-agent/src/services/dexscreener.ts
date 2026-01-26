/**
 * DexScreener Service
 * Best for Solana Memecoins, Pump.fun tokens, and 24h stats.
 * API Limit: 300 requests per minute (Generous)
 */

interface DexTokenData {
    priceUsd: string;
    priceChange: {
      h24: number;
      h6: number;
      h1: number;
      m5: number;
    };
    baseToken: {
      address: string;
      symbol: string;
    };
  }
  
  const DEX_API_BASE = "https://api.dexscreener.com/latest/dex/tokens";
  
  // Cache to prevent spamming
  const cache: Record<string, { price: number; change24h: number; timestamp: number }> = {};
  const CACHE_TTL = 30 * 1000; // 30 seconds
  
  export const DexScreenerService = {
    getMarketData: async (mints: string[]): Promise<Record<string, { price: number; change24h: number }>> => {
      
      // 🔍 DEBUG: 入力チェック
      // console.log(`[DexScreener] Input mints: ${mints.length}`);
  
      const validMints = mints
        .filter(m => m && typeof m === 'string' && m.length > 30)
        .map(m => m.trim());
        
      if (validMints.length === 0) {
          console.warn("[DexScreener] No valid mints found in input");
          return {};
      }
  
      // ... (キャッシュチェックロジックは変更なし)
      const uncachedMints = validMints; // デバッグのためキャッシュ無視してもOK（本番は戻す）
  
      const chunks = chunkArray(uncachedMints, 30);
      const fetchPromises = chunks.map(async (chunk) => {
        try {
          const ids = chunk.join(',');
          const url = `${DEX_API_BASE}/${ids}`;
          // console.log(`[DexScreener] Fetching: ${url}`); // URL確認
          
          const res = await fetch(url);
          if (!res.ok) {
              console.error(`[DexScreener] HTTP Error ${res.status}`);
              return null;
          }
          return await res.json();
        } catch (e) {
          console.error("[DexScreener] Fetch Error", e);
          return null;
        }
      });
  
      const responses = await Promise.all(fetchPromises);
  
      const finalResult: Record<string, { price: number; change24h: number }> = {};
      
      // キャッシュからの復元も含める
      validMints.forEach(mint => {
          if (cache[mint]) finalResult[mint] = { price: cache[mint].price, change24h: cache[mint].change24h };
      });
  
      responses.forEach(data => {
        if (!data || !Array.isArray(data.pairs)) return;
        
        data.pairs.forEach((pair: any) => {
          const mint = pair.baseToken.address;
          
          // 取得したデータが有効かチェック
          const price = parseFloat(pair.priceUsd) || 0;
          const change = pair.priceChange?.h24 || 0;
  
          // 🔍 DEBUG: 個別トークンのデータ確認 (特定の銘柄だけログに出すなど)
          // if (mint.startsWith("So111")) console.log("SOL Data:", { price, change });
  
          cache[mint] = { price, change24h: change, timestamp: Date.now() };
          finalResult[mint] = { price, change24h: change };
        });
      });
  
      // 🔍 DEBUG: 最終取得数
      console.log(`[DexScreener] Fetched data for ${Object.keys(finalResult).length} tokens`);
      
      return finalResult;
    }
  };
  
  function chunkArray(array: string[], size: number) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }