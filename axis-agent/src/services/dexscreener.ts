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

  const cache: Record<string, { price: number; change24h: number; timestamp: number }> = {};
  const CACHE_TTL = 30 * 1000;

  export const DexScreenerService = {
    getMarketData: async (mints: string[]): Promise<Record<string, { price: number; change24h: number }>> => {
      const validMints = mints
        .filter(m => m && typeof m === 'string' && m.length > 30)
        .map(m => m.trim());

      if (validMints.length === 0) return {};

      const now = Date.now();
      const uncachedMints = validMints.filter(mint => {
        const cached = cache[mint];
        return !cached || (now - cached.timestamp > CACHE_TTL);
      });

      const finalResult: Record<string, { price: number; change24h: number }> = {};

      validMints.forEach(mint => {
        if (cache[mint]) finalResult[mint] = { price: cache[mint].price, change24h: cache[mint].change24h };
      });

      if (uncachedMints.length === 0) return finalResult;

      const chunks = chunkArray(uncachedMints, 30);
      const responses = await Promise.all(chunks.map(async (chunk) => {
        try {
          const res = await fetch(`${DEX_API_BASE}/${chunk.join(',')}`);
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      }));

      responses.forEach(data => {
        if (!data || !Array.isArray(data.pairs)) return;

        data.pairs.forEach((pair: any) => {
          const mint = pair.baseToken.address;
          const price = parseFloat(pair.priceUsd) || 0;
          const change = pair.priceChange?.h24 || 0;

          cache[mint] = { price, change24h: change, timestamp: now };
          finalResult[mint] = { price, change24h: change };
        });
      });

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