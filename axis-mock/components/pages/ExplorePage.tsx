"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import TinderCard from "react-tinder-card";
import { useAxisStore } from "@/app/store/useAxisStore";
import { 
  Sparkles, TrendingUp, ArrowRight, X, Heart, Info, RotateCcw, Wallet, Loader2, 
  List, Grid, ArrowUpDown, Search // 追加
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area"; // リストのスクロール用
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // ソート用

export function ExplorePage() {
  const router = useRouter();
  const { vaults, fetchVaults, isLoading: isStoreLoading } = useAxisStore();
  
  const [isNavigating, setIsNavigating] = useState(false);
  
  // ★ 追加: 表示モードの管理 ('swipe' | 'list')
  const [viewMode, setViewMode] = useState<'swipe' | 'list'>('swipe');
  // ★ 追加: ソート順 ('apy' | 'tvl' | 'newest')
  const [sortBy, setSortBy] = useState("apy");

  useEffect(() => {
    fetchVaults();
  }, [fetchVaults]);

  // DBデータの整形とソート
  const db = useMemo(() => {
    if (!vaults) return [];
    let data = [...vaults];

    // Listモード用のソートロジック
    if (viewMode === 'list') {
      if (sortBy === 'apy') data.sort((a, b) => (b.apy || 0) - (a.apy || 0));
      else if (sortBy === 'tvl') data.sort((a, b) => (b.tvl || 0) - (a.tvl || 0));
      else if (sortBy === 'newest') data.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    } else {
      // SwipeモードはAPY順（デフォルト）
      data.sort((a, b) => (b.apy || 0) - (a.apy || 0));
    }
    return data;
  }, [vaults, viewMode, sortBy]);

  const currentIndexRef = useRef(0);
  const [isFinished, setIsFinished] = useState(false);
  const isSwipingRef = useRef(false);

  const childRefs = useMemo(
    () => Array(db.length).fill(0).map(() => React.createRef<any>()),
    [db.length]
  );

  useEffect(() => {
    if (!isStoreLoading) {
      if (db.length === 0) {
        setIsFinished(true);
      } else {
        currentIndexRef.current = db.length - 1;
        setIsFinished(false);
      }
    }
  }, [db.length, isStoreLoading]);

  // --- Handlers (Swipe Logic) ---
  const swipe = async (dir: string) => {
    const idx = currentIndexRef.current;
    if (isSwipingRef.current || idx < 0 || idx >= db.length) return;
    isSwipingRef.current = true;
    const cardRef = childRefs[idx];
    if (cardRef && cardRef.current) await cardRef.current.swipe(dir); 
  };

  const onSwipe = (direction: string, name: string, index: number) => {
    currentIndexRef.current -= 1;
    if (direction === "right") {
      toast.success(`Added ${name} to Watchlist`, { icon: <Heart className="w-4 h-4 text-pink-500 fill-pink-500" /> });
    }
  };

  const onCardLeftScreen = (name: string, index: number) => {
    isSwipingRef.current = false;
    if (currentIndexRef.current < 0) setIsFinished(true);
  };

  const resetCards = () => {
    setIsFinished(false);
    currentIndexRef.current = db.length - 1;
    isSwipingRef.current = false;
    setViewMode('swipe'); // スワイプモードに戻す
    fetchVaults();
  };

  const handleCardClick = (id: string) => {
    if (!isSwipingRef.current) {
        setIsNavigating(true);
        router.push(`/vault/${id}`);
    }
  };

  // --- UI Components ---

  if (isStoreLoading && db.length === 0) {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
            <p className="text-neutral-500 font-serif text-sm animate-pulse">Scanning On-chain Vaults...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full h-[100dvh] relative overflow-hidden ">
      
      {/* Loading Overlay */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center"
          >
             <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
             <p className="text-neutral-400 font-serif text-sm animate-pulse tracking-widest uppercase">Opening Vault...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header (共通) */}
      <div className="absolute top-0 left-0 w-full pt-[max(2.5rem,env(safe-area-inset-top))] pb-4 px-6 flex items-center justify-between z-20 pointer-events-none">
        <div>
            <h2 className="text-white font-serif text-2xl font-bold italic tracking-tighter drop-shadow-lg">
                Axis Discover
            </h2>
            <p className="text-[10px] text-neutral-400 uppercase tracking-[0.2em] mt-1 font-medium">
                {viewMode === 'swipe' ? "Swipe to Explore" : "Compare Strategies"}
            </p>
        </div>
        
        {/* View Toggle Button (Always accessible) */}
        <div className="pointer-events-auto">
            <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 w-10 h-10 backdrop-blur-md"
                onClick={() => setViewMode(prev => prev === 'swipe' ? 'list' : 'swipe')}
            >
                {viewMode === 'swipe' ? <List size={18} /> : <Grid size={18} />}
            </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 w-full relative pt-32 pb-0">
        <AnimatePresence mode="wait">
          
          {/* ==================== SWIPE VIEW ==================== */}
          {viewMode === 'swipe' && (
            <motion.div
                key="swipe-view"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-full h-full flex flex-col items-center justify-start max-w-md mx-auto relative"
            >
                {!isFinished ? (
                     <div className="relative w-full h-[55vh] min-h-[420px] flex justify-center items-center">
                        {db.map((vault, index) => (
                            <TinderCard
                                ref={childRefs[index]}
                                className="absolute w-[85%] max-w-[320px] h-full"
                                key={vault.id}
                                onSwipe={(dir) => onSwipe(dir, vault.name, index)}
                                onCardLeftScreen={() => onCardLeftScreen(vault.name, index)}
                                preventSwipe={["up", "down"]}
                                swipeRequirementType="position"
                                swipeThreshold={100}
                            >
                                {/* Card Design (既存のまま) */}
                                <div 
                                    onClick={() => handleCardClick(vault.id)}
                                    className="relative w-full h-full bg-[#111] border border-white/10 rounded-[24px] shadow-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform select-none group"
                                >
                                    <div className="absolute top-4 right-4 z-20">
                                        <div className="bg-black/60 backdrop-blur-md border border-white/10 text-white px-3 py-1.5 rounded-full shadow-lg flex flex-col items-end">
                                            <span className="text-[8px] font-bold text-emerald-400 uppercase leading-none mb-0.5">APY</span>
                                            <span className="text-base font-mono font-bold tracking-tight">+{vault.apy ? vault.apy.toFixed(1) : "12.5"}%</span>
                                        </div>
                                    </div>
                                    <div className="h-[45%] w-full relative overflow-hidden bg-neutral-900">
                                        {vault.image_url ? (
                                            <img src={vault.image_url} alt={vault.name} className="w-full h-full object-cover opacity-90" />
                                        ) : (
                                            <div className={`w-full h-full bg-gradient-to-br ${index % 2 === 0 ? "from-indigo-900 to-black" : "from-emerald-900 to-black"} flex items-center justify-center`}>
                                                <span className="text-7xl font-serif text-white/10 font-bold">{vault.symbol ? vault.symbol[0] : "A"}</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
                                    </div>
                                    <div className="p-5 h-[55%] flex flex-col justify-between bg-[#111]">
                                        <div>
                                            <h3 className="text-xl font-serif font-bold text-white leading-tight mb-1">{vault.name}</h3>
                                            <p className="text-neutral-500 font-mono text-[10px] uppercase tracking-wider mb-4">{vault.symbol} // {vault.creator ? "USER" : "OFFICIAL"}</p>
                                            <div className="space-y-2">
                                                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest flex items-center gap-1.5"><TrendingUp size={10} className="text-emerald-500" /> Composition</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {vault.composition?.slice(0, 3).map((comp: any, i: number) => (
                                                        <Badge key={i} variant="secondary" className="bg-white/5 text-neutral-300 border border-white/5 text-[9px] px-2 h-5">{comp.token?.symbol || "Unknown"} <span className="ml-1 text-emerald-400">{comp.weight}%</span></Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-end justify-between border-t border-white/5 pt-3">
                                            <div><span className="text-[8px] text-neutral-600 uppercase font-bold block mb-0.5">Min Inv.</span><span className="text-lg font-mono text-white">${(vault.min_liquidity || 0).toLocaleString()}</span></div>
                                            <ArrowRight size={16} className="text-white"/>
                                        </div>
                                    </div>
                                </div>
                            </TinderCard>
                        ))}

                        {/* Control Buttons */}
                        <div className="absolute -bottom-20 flex items-center gap-6">
                            <button onClick={() => swipe('left')} className="w-12 h-12 rounded-full border border-white/10 bg-[#111] flex items-center justify-center text-neutral-500 hover:text-red-500 transition-colors"><X size={20} /></button>
                            <button onClick={() => swipe('right')} className="w-12 h-12 rounded-full border border-white/10 bg-[#111] flex items-center justify-center text-neutral-500 hover:text-emerald-400 transition-colors"><Heart size={20} /></button>
                        </div>
                     </div>
                ) : (
                    // --- Finished / All Caught Up Screen ---
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center text-center max-w-[280px] px-6 py-8 bg-[#111] border border-white/10 rounded-[12px] shadow-2xl mt-12"
                    >
                        <h2 className="text-xl font-serif font-bold text-white mb-2">All Caught Up</h2>
                        <p className="text-neutral-400 text-[10px] leading-relaxed mb-6">Create your own strategy or<br/>compare all vaults in list view.</p>
                        <div className="flex flex-col gap-3 w-full">
                            <Button onClick={() => setViewMode('list')} className="h-10 w-full rounded-lg bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 text-xs">
                                <List size={14} /> Browse All Vaults
                            </Button>
                            <Button onClick={() => router.push('/create')} variant="outline" className="h-10 w-full rounded-lg border-white/10 text-white hover:bg-white/5 gap-2 text-xs"><Sparkles size={14} /> Create with AI</Button>
                            <button onClick={resetCards} className="mt-2 text-[9px] text-neutral-500 hover:text-white uppercase tracking-widest font-bold"><RotateCcw size={10} className="inline mr-1"/> Replay</button>
                        </div>
                    </motion.div>
                )}
            </motion.div>
          )}

          {/* ==================== LIST VIEW (Catalog) ==================== */}
          {viewMode === 'list' && (
            <motion.div
                key="list-view"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="w-full h-full flex flex-col px-4 max-w-md mx-auto"
            >
                {/* Sort & Filter Controls */}
                <div className="flex items-center justify-between mb-4 px-2">
                    <p className="text-xs text-neutral-500 font-bold">{db.length} Vaults Found</p>
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[110px] h-8 text-[10px] bg-white/5 border-white/10 text-white rounded-lg">
                            <ArrowUpDown size={10} className="mr-2" />
                            <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1c1c1e] border-white/10 text-white">
                            <SelectItem value="apy">Highest APY</SelectItem>
                            <SelectItem value="tvl">Highest TVL</SelectItem>
                            <SelectItem value="newest">Newest</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Scrollable List */}
                <ScrollArea className="flex-1 -mx-4 px-4 pb-20">
                    <div className="space-y-3 pb-32">
                        {db.map((vault) => (
                            <div 
                                key={vault.id}
                                onClick={() => handleCardClick(vault.id)}
                                className="bg-[#111] border border-white/5 rounded-xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer hover:bg-white/5 group"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Icon */}
                                    <div className="w-10 h-10 rounded-full bg-neutral-900 border border-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {vault.image_url ? (
                                            <img src={vault.image_url} alt="" className="w-full h-full object-cover opacity-80" />
                                        ) : (
                                            <span className="font-serif font-bold text-white text-sm">{vault.symbol[0]}</span>
                                        )}
                                    </div>
                                    
                                    {/* Info */}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-white font-bold text-sm truncate">{vault.name}</h4>
                                            {vault.apy && vault.apy > 20 && (
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-[9px] h-4 px-1">Hot</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-neutral-500 mt-0.5">
                                            <span className="bg-white/5 px-1.5 py-0.5 rounded text-neutral-400 border border-white/5">{vault.symbol}</span>
                                            <span>• Min ${vault.min_liquidity?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics (Right Side) */}
                                <div className="text-right flex-shrink-0 pl-2">
                                    <div className="text-emerald-400 font-mono font-bold text-base leading-tight">
                                        +{vault.apy ? vault.apy.toFixed(1) : "0.0"}%
                                    </div>
                                    <div className="text-[10px] text-neutral-600 font-medium uppercase tracking-wider mt-0.5">
                                        APY
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}