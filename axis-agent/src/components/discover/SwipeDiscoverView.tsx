import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Loader2, Sparkles } from 'lucide-react';
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
  
  // レンダリング回数を減らすため、State更新をまとめる
  const [tokenMap, setTokenMap] = useState<Record<string, TokenData>>({});
  const [userMap, setUserMap] = useState<Record<string, any>>({});
  
  // 読み込み済みフラグ (StrictModeでの2回実行防止)
  const isLoaded = useRef(false);

  useEffect(() => {
    // すでに読み込み済みならスキップ (またはpublicKeyが変わった時だけ再実行)
    if (isLoaded.current && !publicKey) return;

    const loadData = async () => {
      setLoading(true);
      console.log("🚀 Loading Data...");

      try {
        // --- 1. 戦略とトークンを一気に並列取得 (最速) ---
        const [publicRes, myRes, tokensRes] = await Promise.all([
          api.discoverStrategies(50).catch(e => ({ strategies: [] })),
          publicKey ? api.getUserStrategies(publicKey.toBase58()).catch(() => ({ strategies: [] })) : Promise.resolve({ strategies: [] }),
          api.getTokens().catch(() => ({ tokens: [] }))
        ]);

        // --- 2. トークンMapの作成 (1回だけ実行) ---
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
        setTokenMap(tMap); // ★描画1回目

        // --- 3. 戦略リストの結合 ---
        let rawList: any[] = [];
        // ローカルデータ読み込み (エラー無視)
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

        // 重複排除
        const uniqueMap = new Map();
        rawList.forEach(item => {
          const key = item.id || item.signature || Math.random().toString();
          if (!uniqueMap.has(key)) uniqueMap.set(key, item);
        });
        const uniqueStrategies = Array.from(uniqueMap.values());
        
        setStrategies(uniqueStrategies); // ★描画2回目
        
        // --- 4. ユーザープロフィールの一括取得 (ここが重かった原因) ---
        const creators = new Set(uniqueStrategies.map((s: any) => s.ownerPubkey || s.creator).filter(Boolean));
        
        if (creators.size > 0) {
          // Promise.allで並列リクエストし、終わってからまとめてセットする
          const userPromises = Array.from(creators).map(pubkey => 
            api.getUser(pubkey as string).catch(() => null)
          );
          
          const users = await Promise.all(userPromises);
          
          const newUserMap: Record<string, any> = {};
          users.forEach((user, index) => {
            const pubkey = Array.from(creators)[index] as string;
            if (user) {
              newUserMap[pubkey] = user;
            }
          });
          
          setUserMap(newUserMap); // ★描画3回目 (これでループ地獄回避)
        }

      } catch (e) {
        console.error("Critical Error:", e);
      } finally {
        setLoading(false);
        isLoaded.current = true;
      }
    };

    loadData();
  }, [publicKey]); // publicKeyが変わった時のみ再取得

  // ROI計算 (メモ化で軽量化)
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

      // ROI計算
      let weightedSum = 0;
      let totalWeight = 0;
      enrichedTokens.forEach((t: any) => {
         const w = Number(t.weight) || 0;
         const change = tokenMap[t.symbol]?.change24h || 0;
         weightedSum += change * w;
         totalWeight += w;
      });
      const roi = totalWeight > 0 ? weightedSum / totalWeight : 0;

      const owner = s.ownerPubkey || s.creator;
      const userProfile = userMap[owner];

      return {
        ...s,
        id: s.id || s.signature,
        name: s.name || 'Untitled Strategy',
        type: s.type || 'BALANCED',
        tokens: enrichedTokens,
        roi: roi, 
        tvl: Number(s.tvl || s.initialInvestment || 0),
        creatorAddress: owner || 'Unknown',
        creatorPfpUrl: userProfile?.avatar_url ? api.getProxyUrl(userProfile.avatar_url) : null,
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