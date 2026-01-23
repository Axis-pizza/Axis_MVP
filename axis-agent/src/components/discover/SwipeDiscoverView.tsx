// src/components/discover/SwipeDiscoverView.tsx

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Layers, Loader2, Sparkles } from 'lucide-react';
import { SwipeCard } from './SwipeCard';
import { api } from '../../services/api';
import { useWallet } from '@solana/wallet-adapter-react';

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
    const loadData = async () => {
      setLoading(true);
      console.log("🚀 Loading Data...");

      try {
        // 1. まず戦略リストだけを取得 (ここが失敗すると何も出ないので最優先)
        // Publicな戦略と、自分の戦略を並列取得
        const [publicRes, myRes] = await Promise.all([
          api.discoverStrategies(50).catch(e => { console.error("Strategy API Error:", e); return { strategies: [] }; }),
          publicKey ? api.getUserStrategies(publicKey.toBase58()).catch(() => ({ strategies: [] })) : Promise.resolve({ strategies: [] })
        ]);

        console.log("✅ Strategies Loaded:", publicRes?.strategies?.length || 0);

        // 戦略リストの結合と重複除去
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

        const uniqueMap = new Map();
        rawList.forEach(item => {
          const key = item.id || item.signature || Math.random().toString();
          if (!uniqueMap.has(key)) uniqueMap.set(key, item);
        });
        const uniqueStrategies = Array.from(uniqueMap.values());
        
        // ★重要: ここで一度戦略をセットしてしまう (トークン取得を待たない)
        setStrategies(uniqueStrategies);
        setLoading(false); // カードを表示開始

        // 2. 裏でトークン情報を取得 (バックエンド経由)
        api.getTokens()
          .then((tokensRes) => {
            console.log("✅ Tokens Loaded:", tokensRes?.tokens?.length || 0);
            const tMap: Record<string, TokenData> = {};
            const tokenList = tokensRes.tokens || [];
            
            tokenList.forEach((t: any) => {
               tMap[t.symbol.toUpperCase()] = {
                 price: t.price || 0,
                 change24h: t.change24h || 0,
                 logoURI: t.logoURI,
                 address: t.address
               };
            });
            
            // フォールバック
            if (!tMap['SOL']) tMap['SOL'] = { price: 150, change24h: 0, logoURI: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' };
            if (!tMap['USDC']) tMap['USDC'] = { price: 1, change24h: 0, logoURI: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png' };
            
            setTokenMap(tMap);
          })
          .catch(e => {
            console.warn("⚠️ Token fetch failed, using fallback prices.", e);
            // 失敗しても戦略リストは消えない
          });

        // 3. 裏でプロフィール画像を取得
        const creators = new Set(uniqueStrategies.map((s: any) => s.ownerPubkey || s.creator).filter(Boolean));
        const profiles: Record<string, any> = {};
        
        // 少しずつ取得
        for (const pubkey of Array.from(creators)) {
           api.getUser(pubkey).then(user => {
             if (user && user.avatar_url) {
                setUserMap(prev => ({ ...prev, [pubkey as string]: user }));
             }
           }).catch(() => {});
        }

      } catch (e) {
        console.error("Critical Error:", e);
        setLoading(false);
      }
    };

    loadData();
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
        creatorPfpUrl: finalPfpUrl,
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
        <p className="text-sm font-mono animate-pulse">Loading Index Data...</p>
      </div>
    );
  }

  // データがなくても空っぽの画面を表示（エラー回避）
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