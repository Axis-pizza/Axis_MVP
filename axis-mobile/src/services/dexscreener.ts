/**
 * DexScreener Service
 */

const DEX_API_BASE = "https://api.dexscreener.com/latest/dex/tokens";

const cache: Record<string, { price: number; change24h: number; timestamp: number }> = {};

export const DexScreenerService = {
  getMarketData: async (mints: string[]): Promise<Record<string, { price: number; change24h: number }>> => {
    const validMints = mints
      .filter(m => m && typeof m === 'string' && m.length > 30)
      .map(m => m.trim());

    if (validMints.length === 0) return {};

    const uncachedMints = validMints;
    const chunks = chunkArray(uncachedMints, 30);

    const fetchPromises = chunks.map(async (chunk) => {
      try {
        const ids = chunk.join(',');
        const url = `${DEX_API_BASE}/${ids}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
      } catch (e) {
        console.error("[DexScreener] Fetch Error", e);
        return null;
      }
    });

    const responses = await Promise.all(fetchPromises);

    const finalResult: Record<string, { price: number; change24h: number }> = {};

    validMints.forEach(mint => {
      if (cache[mint]) finalResult[mint] = { price: cache[mint].price, change24h: cache[mint].change24h };
    });

    responses.forEach(data => {
      if (!data || !Array.isArray(data.pairs)) return;

      data.pairs.forEach((pair: any) => {
        const mint = pair.baseToken.address;
        const price = parseFloat(pair.priceUsd) || 0;
        const change = pair.priceChange?.h24 || 0;

        cache[mint] = { price, change24h: change, timestamp: Date.now() };
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
