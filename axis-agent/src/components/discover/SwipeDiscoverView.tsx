import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, Loader2, Sparkles, Rocket, X } from 'lucide-react';
import { SwipeCard } from './SwipeCard';
import { api } from '../../services/api';
import { useWallet } from '../../hooks/useWallet';
import { JupiterService } from '../../services/jupiter';
import { DexScreenerService } from '../../services/dexscreener';

// --- Types ---
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
  onOverlayChange?: (isActive: boolean) => void;
}

// --- Components ---

/**
 * ★追加: リアルなカード型のスケルトンローダー
 */
const SwipeCardSkeleton = ({ index }: { index: number }) => (
  <div 
    className="absolute inset-0 w-full h-full bg-[#121212] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col p-5 select-none pointer-events-none"
    style={{
      // スタック表示のシミュレーション
      transform: `scale(${1 - index * 0.05}) translateY(${index * 10}px)`,
      zIndex: 100 - index,
      opacity: Math.max(0, 1 - index * 0.3),
      filter: 'grayscale(100%) brightness(0.8)'
    }}
  >
    {/* Header Skeleton */}
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-2">
        <div className="w-16 h-5 bg-white/10 rounded-full animate-pulse" />
        <div className="w-40 h-8 bg-white/10 rounded-lg animate-pulse" />
      </div>
      <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse border border-white/5" />
    </div>

    {/* Description Skeleton */}
    <div className="space-y-2 mb-6">
      <div className="w-full h-3 bg-white/5 rounded animate-pulse" />
      <div className="w-3/4 h-3 bg-white/5 rounded animate-pulse" />
    </div>

    {/* Stats Grid Skeleton */}
    <div className="grid grid-cols-2 gap-2 mb-4">
      <div className="h-24 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
      <div className="flex flex-col gap-2 h-24">
         <div className="flex-1 bg-white/5 rounded-xl animate-pulse border border-white/5" />
         <div className="flex-1 bg-white/5 rounded-xl animate-pulse border border-white/5" />
      </div>
    </div>

    {/* List Skeleton */}
    <div className="flex-1 space-y-2 mt-2 overflow-hidden">
       <div className="flex justify-between mb-2 px-1">
          <div className="w-24 h-3 bg-white/5 rounded animate-pulse" />
          <div className="w-12 h-3 bg-white/5 rounded animate-pulse" />
       </div>
       {[1, 2, 3, 4].map((i) => (
         <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl h-14 animate-pulse border border-white/5">
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 rounded-full bg-white/10" />
               <div className="space-y-1.5">
                  <div className="w-12 h-3 bg-white/10 rounded" />
                  <div className="w-8 h-2 bg-white/10 rounded" />
               </div>
            </div>
            <div className="w-10 h-4 bg-white/10 rounded" />
         </div>
       ))}
    </div>
  </div>
);

/**
 * CosmicLaunchEffect
 * (変更なし)
 */
const CosmicLaunchEffect = () => {
  const trailCount = 12;
  const particleCount = 50;
  const random = (min: number, max: number) => Math.random() * (max - min) + min;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: trailCount }).map((_, i) => {
        const delay = random(0, 0.4);
        const duration = random(0.6, 1.2);
        const startX = -10;
        const endX = 120; 
        const startY = 110;
        const endY = -20; 
        const width = random(2, 8); 
        const angle = 45; 

        return (
          <motion.div
            key={`trail-${i}`}
            initial={{ opacity: 0, scaleY: 0, x: `${startX}vw`, y: `${startY}vh`, rotate: angle }}
            animate={{ opacity: [0, 1, 0], scaleY: [1, 2, 1], x: [`${startX}vw`, `${endX}vw`], y: [`${startY}vh`, `${endY}vh`] }}
            transition={{ duration: duration, delay: delay, ease: [0.1, 0, 0.3, 1] }}
            style={{
              position: 'absolute',
              width: `${width}px`,
              height: '30vh',
              background: 'linear-gradient(to top, transparent, #fbbf24, #f97316, #22d3ee, transparent)',
              filter: 'blur(4px) brightness(2)',
              transformOrigin: 'center',
              boxShadow: '0 0 20px rgba(249, 115, 22, 0.6)'
            }}
          />
        );
      })}
      {Array.from({ length: particleCount }).map((_, i) => {
        const delay = random(0, 0.6);
        const duration = random(0.8, 2.0);
        const size = random(2, 5);
        const startX = random(-10, 40); 
        const startY = random(80, 120);
        const moveX = random(50, 150);
        const moveY = random(-50, -150);
        const colors = ['#fbbf24', '#f97316', '#22d3ee', '#ffffff'];
        const color = colors[Math.floor(random(0, colors.length))];

        return (
          <motion.div
            key={`particle-${i}`}
            initial={{ opacity: 0, x: `${startX}vw`, y: `${startY}vh`, scale: 0 }}
            animate={{ opacity: [0, 1, 0], x: `${startX + moveX}vw`, y: `${startY + moveY}vh`, scale: [0, random(1, 2), 0] }}
            transition={{ duration: duration, delay: delay, ease: "easeOut" }}
            style={{ position: 'absolute', width: `${size}px`, height: `${size}px`, backgroundColor: color, borderRadius: '50%', boxShadow: `0 0 ${size * 2}px ${color}` }}
          />
        );
      })}
       <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 0.6, 0], scale: [1, 3] }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-gradient-to-tr from-orange-500 to-cyan-500 blur-[100px] z-[-1]"
       />
    </div>
  );
};

/**
 * SuccessOverlay
 * (変更なし)
 */
const SuccessOverlay = ({ strategy, onClose, onGoToStrategy }: { strategy: any, onClose: () => void, onGoToStrategy: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-6 touch-none overflow-hidden"
    >
      <CosmicLaunchEffect />
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-900/20 via-transparent to-blue-900/20 pointer-events-none" />
      
      <motion.div 
        initial={{ scale: 0.8, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 14, stiffness: 100, delay: 0.1 }}
        className="relative mb-10 z-20 text-center"
      >
        <h1 className="text-5xl md:text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-200 to-orange-500 drop-shadow-[0_0_30px_rgba(234,88,12,0.8)] transform -rotate-3 leading-none tracking-tight">
          READY FOR<br/>TAKEOFF
        </h1>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-2 mt-4"
        >
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          <p className="text-cyan-400 font-mono text-sm tracking-[0.2em] uppercase font-bold">Gem Discovered</p>
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
        </motion.div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 50, rotateX: 20 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ delay: 0.3, type: "spring" }}
        className="w-full max-w-xs bg-[#1C1917]/90 rounded-3xl border border-orange-500/30 p-5 mb-8 relative overflow-hidden shadow-2xl z-20 backdrop-blur-xl"
      >
         <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-500 via-yellow-400 to-cyan-500" />
         <div className="flex items-center gap-4 mb-5 pt-2">
            <div className="relative">
                <img 
                  src={strategy.creatorPfpUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${strategy.creatorAddress}`}
                  alt="creator" 
                  className="w-16 h-16 rounded-full border-2 border-white/10 bg-black object-cover"
                />
                <div className="absolute -bottom-2 -right-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#1C1917] shadow-lg flex items-center gap-1">
                    ROI {(strategy.roi || 0).toFixed(0)}%
                </div>
            </div>
            <div className="min-w-0">
               <h3 className="font-bold text-white text-xl leading-tight truncate">{strategy.name}</h3>
               <p className="text-xs text-white/40 font-mono mt-1 flex items-center gap-1">
                 By {strategy.creatorAddress?.slice(0, 4)}...{strategy.creatorAddress?.slice(-4)}
               </p>
            </div>
         </div>
         <div className="flex gap-1.5 overflow-hidden pl-1 opacity-90">
            {(strategy.tokens || []).slice(0, 6).map((t: any, i: number) => (
                <div key={i} className="w-9 h-9 rounded-full bg-black flex items-center justify-center border border-white/10 shadow-lg relative -ml-2 first:ml-0 transition-transform hover:-translate-y-1">
                    {t.logoURI ? (
                        <img src={t.logoURI} alt={t.symbol} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        <span className="text-[9px] text-white font-bold">{t.symbol?.[0]}</span>
                    )}
                </div>
            ))}
         </div>
      </motion.div>

      <div className="flex flex-col gap-3 w-full max-w-xs z-20 safe-area-bottom">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={onGoToStrategy}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group w-full py-4 bg-gradient-to-r from-orange-600 to-yellow-600 text-white font-black text-lg rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all flex items-center justify-center gap-2 relative overflow-hidden"
        >
          <span className="relative z-10 flex items-center gap-2">
            <Rocket className="w-5 h-5 fill-white" /> LFG (View Detail)
          </span>
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={onClose}
          className="w-full py-4 bg-white/5 border border-white/10 text-white/60 font-bold text-lg rounded-2xl hover:bg-white/10 hover:text-white active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          Keep Scouting
        </motion.button>
      </div>
    </motion.div>
  );
};

// --- Main View Component ---

export const SwipeDiscoverView = ({ onToggleView, onStrategySelect, onOverlayChange }: SwipeDiscoverViewProps) => {
  const { publicKey } = useWallet();
  const [strategies, setStrategies] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSwiping, setIsSwiping] = useState(false);
  const [matchedStrategy, setMatchedStrategy] = useState<any | null>(null);
  
  const [tokenDataMap, setTokenDataMap] = useState<Record<string, TokenData>>({});
  const [userMap, setUserMap] = useState<Record<string, any>>({});
  
  const dataFetched = useRef(false);

  useEffect(() => {
    onOverlayChange?.(matchedStrategy !== null);
  }, [matchedStrategy, onOverlayChange]);

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
            const [jupPrices, dexData] = await Promise.all([
                JupiterService.getPrices(mintArray).catch(() => ({})) as Promise<Record<string, number>>,
                DexScreenerService.getMarketData(mintArray).catch(() => ({})) as Promise<Record<string, { price: number; change24h: number }>>
            ]);

            mintArray.forEach(mint => {
                const current = initialMap[mint];
                if (!current) return;
                const price = jupPrices[mint] || dexData[mint]?.price || current.price;
                const change = dexData[mint]?.change24h || current.change24h;
                initialMap[mint] = { ...current, price, change24h: change };
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

  const handleSwipe = useCallback((direction: 'left' | 'right', strategy: any) => {
    if (isSwiping || matchedStrategy) return;
    setIsSwiping(true);
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      if (direction === 'right') {
        setMatchedStrategy(strategy);
      }
      setIsSwiping(false);
    }, 200);
  }, [isSwiping, matchedStrategy]);

  const handleGoToStrategy = () => {
    if (matchedStrategy) {
      onStrategySelect(matchedStrategy);
      setMatchedStrategy(null);
    }
  };

  const handleCloseMatch = () => {
    setMatchedStrategy(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentStrategy = enrichedStrategies[currentIndex];
      if (!currentStrategy || matchedStrategy) return;
      if (e.key === 'ArrowLeft') handleSwipe('left', currentStrategy);
      else if (e.key === 'ArrowRight') handleSwipe('right', currentStrategy);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, enrichedStrategies, handleSwipe, matchedStrategy]);

  // ★修正: ローディング画面をスケルトンカードに変更
  if (loading) {
    return (
      <div className="relative w-full h-[100dvh] bg-[#030303] overflow-hidden flex flex-col">
        <div className="flex-1 w-full flex items-center justify-center px-4 pb-53 pt-12 md:pb-24 relative">
          <div className="relative w-full max-w-sm h-full max-h-[70vh] md:max-h-[600px] z-10">
             {/* スケルトンを3枚スタック表示 */}
             {[0, 1, 2].map((i) => (
                <SwipeCardSkeleton key={i} index={i} />
             ))}
             
             {/* 中央のローディングインジケーター */}
             <div className="absolute inset-0 flex flex-col items-center justify-center z-50">
                <div className="bg-[#0C0A09]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center">
                   <Loader2 className="w-8 h-8 text-[#D97706] animate-spin mb-3" />
                   <p className="text-xs font-bold text-white/50 tracking-widest animate-pulse">
                     SCOUTING GEMS...
                   </p>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  const currentStrategy = enrichedStrategies[currentIndex];

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
      <AnimatePresence>
        {matchedStrategy && (
          <SuccessOverlay 
            strategy={matchedStrategy} 
            onClose={handleCloseMatch} 
            onGoToStrategy={handleGoToStrategy} 
          />
        )}
      </AnimatePresence>

      <div className="flex-1 w-full flex items-center justify-center px-4 pb-53 pt-12 md:pb-24 relative">
        {/* Left Button (Pass) */}
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.1, backgroundColor: "rgba(239, 68, 68, 0.2)" }}
          whileTap={{ scale: 0.9 }}
          onClick={() => currentStrategy && handleSwipe('left', currentStrategy)}
          disabled={isSwiping}
          className="hidden md:flex absolute left-8 lg:left-20 xl:left-32 z-30 w-16 h-16 rounded-full border border-white/10 bg-[#1C1917]/50 backdrop-blur-md text-white/40 hover:text-red-500 hover:border-red-500/50 transition-colors items-center justify-center shadow-lg"
        >
          <X className="w-8 h-8" />
        </motion.button>

        {/* Card Stack */}
        <div className="relative w-full max-w-sm h-full max-h-[70vh] md:max-h-[600px] z-10">
          <AnimatePresence>
            {enrichedStrategies.slice(currentIndex, currentIndex + 3).reverse().map((strategy, i) => {
              const stackIndex = enrichedStrategies.slice(currentIndex, currentIndex + 3).length - 1 - i;
              return (
                <SwipeCard
                  key={strategy.id}
                  index={stackIndex} 
                  isTop={stackIndex === 0}
                  strategy={strategy}
                  onSwipeLeft={() => handleSwipe('left', strategy)}
                  onSwipeRight={() => handleSwipe('right', strategy)}
                  onTap={() => onStrategySelect(strategy)}
                />
              );
            })} 
          </AnimatePresence>
        </div>

        {/* Right Button (Like) */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.1, backgroundColor: "rgba(16, 185, 129, 0.2)" }}
          whileTap={{ scale: 0.9 }}
          onClick={() => currentStrategy && handleSwipe('right', currentStrategy)}
          disabled={isSwiping}
          className="hidden md:flex absolute right-8 lg:right-20 xl:right-32 z-30 w-16 h-16 rounded-full border border-white/10 bg-[#1C1917]/50 backdrop-blur-md text-white/40 hover:text-emerald-400 hover:border-emerald-400/50 transition-colors items-center justify-center shadow-lg"
        >
          <Rocket className="w-8 h-8" />
        </motion.button>
      </div>
    </div>
  );
};