import { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { SwipeCard } from './SwipeCard';
import { api } from '../../services/api';
import { useWallet } from '../../hooks/useWallet';
import { JupiterService } from '../../services/jupiter';
import { DexScreenerService } from '../../services/dexscreener';

interface TokenData {
  symbol: string;
  price: number;
  change24h: number;
  logoURI?: string; 
  address: string; 
}

interface SwipeDiscoverViewProps {
  onToggleView: () => void;
  onStrategySelect: (strategy: any) => void;
}

export const SwipeDiscoverView = ({ onToggleView, onStrategySelect }: SwipeDiscoverViewProps) => {
  const { publicKey } = useWallet();
  const [strategies, setStrategies] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [tokenDataMap, setTokenDataMap] = useState<Record<string, TokenData>>({});
  const [userMap, setUserMap] = useState<Record<string, any>>({});
  
  const dataFetched = useRef(false);

  useEffect(() => {
    if (dataFetched.current) return;
    dataFetched.current = true;

    const loadData = async () => {
      setLoading(true);
      
      try {
        const [publicRes, myRes, tokensRes] = await Promise.all([
          api.discoverStrategies(50).catch(e => ({ strategies: [] })),
          publicKey ? api.getUserStrategies(publicKey.toBase58()).catch(() => ({ strategies: [] })) : Promise.resolve({ strategies: [] }),
          api.getTokens().catch(() => ({ tokens: [] }))
        ]);

        const initialMap: Record<string, TokenData> = {};
        const backendTokens = tokensRes.tokens || [];
        backendTokens.forEach((t: any) => {
           if (t.mint) {
             initialMap[t.mint] = {
               symbol: t.symbol?.toUpperCase() || 'UNKNOWN',
               price: t.price || 0,
               change24h: t.change24h || 0,
               logoURI: t.logoURI,
               address: t.mint
             };
           }
        });

        const myApiStrats = (myRes.strategies || myRes || []);
        const publicStrats = publicRes.strategies || [];
        const combined = [...myApiStrats, ...publicStrats];
        
        const uniqueMap = new Map();
        combined.forEach(item => {
          if (item.id && !uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
          if (item.address && !uniqueMap.has(item.address)) uniqueMap.set(item.address, item);
        });
        const uniqueStrategies = Array.from(uniqueMap.values());
        setStrategies(uniqueStrategies);

        const allMints = new Set<string>();
        Object.keys(initialMap).forEach(m => allMints.add(m));

        uniqueStrategies.forEach((s: any) => {
            let tokens = s.tokens || s.composition || [];
            if (typeof tokens === 'string') {
                try { tokens = JSON.parse(tokens); } catch {}
            }
            tokens.forEach((t: any) => {
                if (t.mint) {
                    allMints.add(t.mint);
                    if (!initialMap[t.mint]) {
                        initialMap[t.mint] = {
                            symbol: t.symbol?.toUpperCase() || 'UNKNOWN',
                            price: 0,
                            change24h: 0,
                            logoURI: t.logoURI,
                            address: t.mint
                        };
                    }
                }
            });
        });

        const mintArray = Array.from(allMints);
        if (mintArray.length > 0) {
            // ★修正: 型キャストを追加してインデックスエラーを回避
            const [jupPrices, dexData] = await Promise.all([
                JupiterService.getPrices(mintArray).catch(() => ({})) as Promise<Record<string, number>>,
                DexScreenerService.getMarketData(mintArray).catch(() => ({})) as Promise<Record<string, { price: number; change24h: number }>>
            ]);

            mintArray.forEach(mint => {
                const current = initialMap[mint];
                if (!current) return;

                // ★これでエラーが消えるはず
                const price = jupPrices[mint] || dexData[mint]?.price || current.price;
                const change = dexData[mint]?.change24h || current.change24h;

                initialMap[mint] = {
                    ...current,
                    price,
                    change24h: change
                };
            });
        }
        
        setTokenDataMap(initialMap);

        const creators = new Set<string>();
        uniqueStrategies.forEach((s: any) => {
          if (s.ownerPubkey) creators.add(s.ownerPubkey);
          if (s.creator) creators.add(s.creator);
        });
        
        if (creators.size > 0) {
          const userPromises = Array.from(creators).map(pubkey => 
            api.getUser(pubkey).then(res => res.success ? res.user : null).catch(() => null)
          );
          const users = await Promise.all(userPromises);
          const newUserMap: Record<string, any> = {};
          users.forEach((user) => {
            if (user && user.pubkey) newUserMap[user.pubkey] = user;
          });
          setUserMap(newUserMap);
        }

      } catch (e) {
        console.error("Load Error:", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [publicKey]);

  const enrichedStrategies = useMemo(() => {
    return strategies.map(s => {
      let tokens = s.tokens || s.composition || [];
      if (typeof tokens === 'string') {
        try { tokens = JSON.parse(tokens); } catch(e) { tokens = []; }
      }

      const enrichedTokens = tokens.map((t: any) => {
        const tokenData = t.mint ? tokenDataMap[t.mint] : null;
        
        return {
           ...t,
           symbol: t.symbol?.toUpperCase(), 
           currentPrice: tokenData?.price || 0,
           change24h: tokenData?.change24h || 0,
           logoURI: t.logoURI || tokenData?.logoURI || null, 
           address: t.mint || null 
        };
      });

      let weightedSum = 0;
      let totalWeight = 0;
      enrichedTokens.forEach((t: any) => {
         const w = Number(t.weight) || 0;
         const change = Number(t.change24h) || 0;
         weightedSum += change * w;
         totalWeight += w;
      });
      const calculatedRoi = totalWeight > 0 ? (weightedSum / totalWeight) : 0;

      const ownerAddress = s.ownerPubkey || s.creator;
      const userProfile = userMap[ownerAddress];

      return {
        ...s,
        id: s.address || s.pubkey || s.id, 

        name: s.name || 'Untitled Strategy',
        type: s.type || 'BALANCED',
        tokens: enrichedTokens,
        roi: calculatedRoi, 
        tvl: Number(s.tvl || 0),
        creatorAddress: ownerAddress || 'Unknown',
        creatorPfpUrl: userProfile?.avatar_url ? api.getProxyUrl(userProfile.avatar_url) : null,
        description: s.description || userProfile?.bio || '',
        createdAt: s.createdAt || (Date.now() / 1000),
      };
    });
  }, [strategies, tokenDataMap, userMap]);

  const handleSwipe = (direction: 'left' | 'right') => {
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 200);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] text-white/50 bg-[#030303]">
        <Loader2 className="w-10 h-10 animate-spin text-[#D97706] mb-4" />
        <p className="text-sm font-mono animate-pulse">Loading Index Data...</p>
      </div>
    );
  }

  if (enrichedStrategies.length === 0) {
      return (
        <div className="relative w-full h-[100dvh] bg-[#030303] flex flex-col items-center justify-center p-4">
            <h3 className="text-xl font-bold text-white mb-2">No Strategies Found</h3>
            <p className="text-white/50 text-sm">Create one to get started.</p>
        </div>
      );
  }

  if (currentIndex >= enrichedStrategies.length) {
    return (
      <div className="relative w-full h-[100dvh] bg-[#030303] flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#1C1917] rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
            <Sparkles className="w-8 h-8 text-[#D97706]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">That's all for now!</h3>
          <button onClick={() => setCurrentIndex(0)} className="px-6 py-3 bg-[#D97706] text-white font-bold rounded-xl flex items-center gap-2 mx-auto mt-4">
            <RefreshCw className="w-4 h-4" /> Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[100dvh] bg-[#030303] overflow-hidden flex flex-col">
      <div className="flex-1 w-full flex items-center justify-center px-4 pb-53 pt-12 md:pb-24">
        <div className="relative w-full max-w-sm h-full max-h-[70vh] md:max-h-[600px]">
          <AnimatePresence>
            {enrichedStrategies.slice(currentIndex, currentIndex + 3).reverse().map((strategy, i) => {
              const stackIndex = enrichedStrategies.slice(currentIndex, currentIndex + 3).length - 1 - i;
              return (
                <SwipeCard
                  key={strategy.id}
                  index={stackIndex} 
                  isTop={stackIndex === 0}
                  strategy={strategy}
                  onSwipeLeft={() => handleSwipe('left')}
                  onSwipeRight={() => onStrategySelect(strategy)}
                  onTap={() => onStrategySelect(strategy)}
                />
              );
            })} 
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};