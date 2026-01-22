import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Layers, Loader2, Sparkles } from 'lucide-react';
import { SwipeCard } from './SwipeCard';
import { api } from '../../services/api';
import { useWallet } from '@solana/wallet-adapter-react';
import { fetchSolanaTokens } from '../../services/coingecko';

interface TokenData {
  price: number;
  change24h: number;
  logoURI?: string; 
  address?: string; 
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
  
  const [tokenMap, setTokenMap] = useState<Record<string, TokenData>>({});
  const [userMap, setUserMap] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        console.log("🚀 Starting Data Load...");

        const [publicRes, myRes, coingeckoTokens] = await Promise.all([
          api.discoverStrategies(50).catch(e => { console.warn("Discover Error:", e); return { strategies: [] }; }),
          publicKey ? api.getUserStrategies(publicKey.toBase58()).catch(e => { console.warn("MyStrat Error:", e); return { strategies: [] }; }) : Promise.resolve({ strategies: [] }),
          fetchSolanaTokens().catch(e => { console.warn("CoinGecko Error:", e); return []; })
        ]);

        // 1. Token Map作成 (CoinGeckoベース)
        const tMap: Record<string, TokenData> = {};
        coingeckoTokens.forEach((t) => {
           tMap[t.symbol.toUpperCase()] = {
             price: t.price || 0,
             change24h: t.change24h || 0,
             logoURI: t.logoURI,
             address: t.address
           };
        });

        // フォールバック: CoinGeckoにない場合の主要トークン
        if (!tMap['SOL']?.logoURI) {
            tMap['SOL'] = { ...tMap['SOL'], price: tMap['SOL']?.price || 150, logoURI: 'https://assets.coingecko.com/coins/images/4128/large/solana.png?1547769862' };
        }
        if (!tMap['USDC']?.logoURI) {
            tMap['USDC'] = { ...tMap['USDC'], price: tMap['USDC']?.price || 1, logoURI: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389' };
        }

        setTokenMap(tMap);

        // 2. 戦略リスト結合
        let rawList: any[] = [];
        try {
          const local = JSON.parse(localStorage.getItem('my_local_strategies') || '[]');
          if (publicKey) {
             const myLocal = local.filter((s: any) => s.ownerPubkey === publicKey.toBase58());
             rawList = [...myLocal];
          }
        } catch(e) {}

        const myApiStrats = (myRes.strategies || myRes || []);
        const publicStrats = publicRes.strategies || [];
        rawList = [...rawList, ...myApiStrats, ...publicStrats];

        // 重複除去
        const uniqueMap = new Map();
        rawList.forEach(item => {
          const key = item.id || item.signature || Math.random().toString();
          if (!uniqueMap.has(key)) uniqueMap.set(key, item);
        });
        const uniqueStrategies = Array.from(uniqueMap.values());
        setStrategies(uniqueStrategies);

        // 3. プロフィール取得 (ProfileViewと同じロジックで取得)
        const creators = new Set(uniqueStrategies.map((s: any) => s.ownerPubkey || s.creator).filter(Boolean));
        const profiles: Record<string, any> = {};
        
        await Promise.all(Array.from(creators).map(async (pubkey: any) => {
          try {
            const user = await api.getUser(pubkey);
            // エラーがなく、データが存在する場合のみ保存
            if (user && !user.error) {
                profiles[pubkey] = user;
            }
          } catch (e) { /* ignore */ }
        }));
        setUserMap(profiles);

      } catch (e) {
        console.error("Discover load error:", e);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [publicKey]);

  const calculateRealtimeROI = (tokens: any[]) => {
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) return 0;
    let weightedSum = 0;
    let totalWeight = 0;
    tokens.forEach(t => {
      const weight = Number(t.weight) || 0;
      const data = tokenMap[t.symbol?.toUpperCase()]; 
      const change = data ? data.change24h : 0; 
      weightedSum += change * weight;
      totalWeight += weight;
    });
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  const enrichedStrategies = useMemo(() => {
    return strategies.map(s => {
      let tokens = s.tokens || s.composition || [];
      if (!Array.isArray(tokens)) tokens = [];

      const enrichedTokens = tokens.map((t: any) => {
        const symbolUpper = t.symbol?.toUpperCase();
        const data = tokenMap[symbolUpper];
        
        return {
           ...t,
           symbol: symbolUpper, 
           currentPrice: data?.price || 0,
           logoURI: data?.logoURI || null, 
           address: data?.address || null
        };
      });

      const owner = s.ownerPubkey || s.creator;
      const userProfile = userMap[owner];

      // ★修正: ProfileViewと同様のPFP取得ロジックを適用
      // DBのカラム名が avatar_url か pfpUrl かの揺らぎを吸収し、Proxyを通す
      let finalPfpUrl = null;
      if (userProfile) {
          const rawUrl = userProfile.pfpUrl || userProfile.avatar_url;
          if (rawUrl) {
              finalPfpUrl = api.getProxyUrl(rawUrl);
          }
      }

      return {
        ...s,
        id: s.id || s.signature,
        name: s.name || 'Untitled Strategy',
        type: s.type || 'BALANCED',
        tokens: enrichedTokens,
        roi: calculateRealtimeROI(tokens), 
        tvl: Number(s.tvl || s.initialInvestment || 0),
        creatorAddress: owner || 'Unknown',
        creatorPfpUrl: finalPfpUrl, // Proxy適用済みのURL
        description: s.description || userProfile?.bio || '',
        createdAt: s.createdAt || (Date.now() / 1000)
      };
    });
  }, [strategies, tokenMap, userMap]);

  const handleSwipe = (direction: 'left' | 'right') => {
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 200);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-white/50 bg-[#030303]">
        <Loader2 className="w-10 h-10 animate-spin text-[#D97706] mb-4" />
        <p className="text-sm font-mono animate-pulse">Fetching Market Data...</p>
      </div>
    );
  }

  if (currentIndex >= enrichedStrategies.length) {
    return (
      <div className="relative w-full h-[100dvh] bg-[#030303] flex flex-col items-center justify-center p-4">
        {/* Header Fixed */}
        <div className="absolute top-safe left-0 right-0 h-16 flex items-center justify-center px-4 z-30">
           <h1 className="text-xl font-bold text-white">Discover</h1>
           <button onClick={onToggleView} className="absolute right-4 p-2 bg-white/10 rounded-full text-white">
             <Layers className="w-5 h-5" />
           </button>
        </div>
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
      {/* Header */}
      <div className="flex-none h-16 pt-safe flex items-center justify-center px-4 z-30 relative">
         <h1 className="text-lg font-bold text-white">Discover</h1>
         <button onClick={onToggleView} className="absolute right-4 p-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/10 transition-colors">
           <Layers className="w-5 h-5" />
         </button>
      </div>
      
      {/* Main Card Area */}
      <div className="flex-1 w-full flex items-center justify-center px-4 pb-24 pt-4">
        <div className="relative w-full max-w-sm h-full max-h-[600px]">
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
                  onSwipeRight={() => handleSwipe('right')}
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