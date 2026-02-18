import { useState, useEffect } from 'react';

export const useDexPerformance = (tokens: any[]) => {
  const [liveData, setLiveData] = useState({
    roi24h: 0,
    nav: 0,
    isLoading: true,
  });

  useEffect(() => {
    const fetchPrices = async () => {
      if (document.hidden) return;

      const addresses = tokens.map((t) => t.address).filter(Boolean);
      if (addresses.length === 0) return;

      try {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${addresses.join(',')}`
        );
        const data = await res.json();

        const priceMap: Record<string, number> = {};
        const changeMap: Record<string, number> = {};

        data.pairs?.forEach((pair: any) => {
          const addr = pair.baseToken.address;
          if (!priceMap[addr]) {
            priceMap[addr] = parseFloat(pair.priceUsd);
            changeMap[addr] = parseFloat(pair.priceChange.h24);
          }
        });

        let currentNav = 0;
        let weightedChange = 0;

        tokens.forEach((t) => {
          const price = priceMap[t.address] || 0;
          const change = changeMap[t.address] || 0;
          currentNav += price * (t.weight / 100);
          weightedChange += change * (t.weight / 100);
        });

        setLiveData({ nav: currentNav, roi24h: weightedChange, isLoading: false });
      } catch {}
    };

    const handleVisibility = () => {
      if (!document.hidden) fetchPrices();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    fetchPrices();
    const interval = setInterval(fetchPrices, 15000);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [tokens]);

  return liveData;
};
