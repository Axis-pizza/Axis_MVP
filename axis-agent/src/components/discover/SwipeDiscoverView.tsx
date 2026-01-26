import { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { SwipeCard } from './SwipeCard';
import { api } from '../../services/api';
import { useWallet } from '../../hooks/useWallet';

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
  
  // マスタデータ
  const [tokenMap, setTokenMap] = useState<Record<string, TokenData>>({});
  const [userMap, setUserMap] = useState<Record<string, any>>({});
  
  const isLoaded = useRef(false);

  useEffect(() => {
    // 2回実行防止
    if (isLoaded.current) return;

    const loadData = async () => {
      setLoading(true);
      console.log("🚀 Loading Data...");

      try {
        // 1. 戦略、自分の戦略、トークンマスタを並列取得
        const [publicRes, myRes, tokensRes] = await Promise.all([
          api.discoverStrategies(50).catch(e => ({ strategies: [] })),
          publicKey ? api.getUserStrategies(publicKey.toBase58()).catch(() => ({ strategies: [] })) : Promise.resolve({ strategies: [] }),
          api.getTokens().catch(() => ({ tokens: [] }))
        ]);

        // 2. トークンMap作成 (ロゴと価格用)
        const tMap: Record<string, TokenData> = {};
        const tokenList = tokensRes.tokens || [];
        tokenList.forEach((t: any) => {
           tMap[t.symbol.toUpperCase()] = {
             price: t.price || 0,
             change24h: t.change24h || 0,
             
           };
        });
        setTokenMap(tMap);

        // 3. 戦略リスト結合 & 重複排除
        const myApiStrats = (myRes.strategies || myRes || []);
        const publicStrats = publicRes.strategies || [];
        const combined = [...myApiStrats, ...publicStrats];

        const uniqueMap = new Map();
        combined.forEach(item => {
          if (!item.id) return; // IDがないものは除外
          if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
        });
        const uniqueStrategies = Array.from(uniqueMap.values());
        setStrategies(uniqueStrategies);

        // 4. ★重要★ 作成者のプロフィール情報を一括取得
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
            if (user && user.pubkey) {
              newUserMap[user.pubkey] = user;
            }
          });
          setUserMap(newUserMap);
        }

      } catch (e) {
        console.error("Critical Error:", e);
      } finally {
        setLoading(false);
        isLoaded.current = true;
      }
    };

    loadData();
  }, [publicKey]);

  // データ結合処理 (PFPとTokenロゴを注入)
  const enrichedStrategies = useMemo(() => {
    return strategies.map(s => {
      let tokens = s.tokens || s.composition || [];
      if (typeof tokens === 'string') {
        try { tokens = JSON.parse(tokens); } catch(e) { tokens = []; }
      }

      const enrichedTokens = tokens.map((t: any) => {
        const symbolUpper = t.symbol?.toUpperCase();
        const data = tokenMap[symbolUpper];
        
        return {
           ...t,
           symbol: symbolUpper, 
           currentPrice: data?.price || 0,
           // ★修正ポイント: DBに保存された t.logoURI があればそれを最優先！
           // なければAPIマスタ(data.logoURI)を使う
           logoURI: t.logoURI || data?.logoURI || null, 
           address: t.mint || data?.address || null 
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

      // ユーザー情報の補完
      const ownerAddress = s.ownerPubkey || s.creator;
      const userProfile = userMap[ownerAddress];

      return {
        ...s,
        id: s.id,
        name: s.name || 'Untitled Strategy',
        type: s.type || 'BALANCED',
        tokens: enrichedTokens,
        roi: roi, 
        tvl: Number(s.tvl || 0),
        creatorAddress: ownerAddress || 'Unknown',
        // ★ ここでPFPを注入 (api.getProxyUrlを通す)
        creatorPfpUrl: userProfile?.avatar_url ? api.getProxyUrl(userProfile.avatar_url) : null,
        description: s.description || userProfile?.bio || '',
        createdAt: s.createdAt || (Date.now() / 1000),
        rebalanceType: s.config?.rebalanceTrigger === 'THRESHOLD' ? 'Threshold' : 'Weekly'
      };
    });
  }, [strategies, tokenMap, userMap]);

  const handleSwipe = (direction: 'left' | 'right') => {
    // スワイプアニメーション後にIndexを進める
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
                  // ★修正: 左 (PASS) は次のカードへスキップ
                  onSwipeLeft={() => handleSwipe('left')}
                  // ★修正: 右 (LIKE) は詳細ページを開く
                  onSwipeRight={() => onStrategySelect(strategy)}
                  // タップも詳細ページ
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