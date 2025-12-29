"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import TinderCard from "react-tinder-card";
import { useAxisStore } from "@/app/store/useAxisStore";
import {
  Sparkles,
  TrendingUp,
  ArrowRight,
  X,
  Heart,
  Info,
  RotateCcw,
  Wallet,
  Loader2,
  List,
  Grid,
  ArrowUpDown,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ExplorePage() {
  const router = useRouter();
  const { vaults, fetchVaults, isLoading: isStoreLoading } = useAxisStore();

  const [isNavigating, setIsNavigating] = useState(false);

  const [viewMode, setViewMode] = useState<"swipe" | "list">("swipe");

  const [sortBy, setSortBy] = useState("apy");

  useEffect(() => {
    fetchVaults();
  }, [fetchVaults]);

  const db = useMemo(() => {
    if (!vaults) return [];
    let data = [...vaults];

    if (viewMode === "list") {
      if (sortBy === "apy") data.sort((a, b) => (b.apy || 0) - (a.apy || 0));
      else if (sortBy === "tvl") data.sort((a, b) => (b.tvl || 0) - (a.tvl || 0));
      else if (sortBy === "newest") data.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    } else {
      data.sort((a, b) => (b.apy || 0) - (a.apy || 0));
    }
    return data;
  }, [vaults, viewMode, sortBy]);

  const currentIndexRef = useRef(0);
  const [isFinished, setIsFinished] = useState(false);
  const isSwipingRef = useRef(false);

  const childRefs = useMemo(
    () =>
      Array(db.length)
        .fill(0)
        .map(() => React.createRef<any>()),
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
      toast.success(`Added ${name} to Watchlist`, {
        icon: <Heart className="h-4 w-4 fill-pink-500 text-pink-500" />,
      });
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
    setViewMode("swipe");
    fetchVaults();
  };

  const handleCardClick = (id: string) => {
    if (!isSwipingRef.current) {
      setIsNavigating(true);
      router.push(`/vault?id=${id}`);
    }
  };

  if (isStoreLoading && db.length === 0) {
    return (
      <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-emerald-500" />
        <p className="animate-pulse font-serif text-sm text-neutral-500">
          Scanning On-chain Vaults...
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] w-full flex-col items-center overflow-hidden">
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black"
          >
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-emerald-500" />
            <p className="animate-pulse font-serif text-sm tracking-widest text-neutral-400 uppercase">
              Opening Vault...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute top-0 left-0 z-20 flex w-full items-center justify-between px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-4">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tighter text-white italic drop-shadow-lg">
            Axis Discover
          </h2>
          <p className="mt-1 text-[10px] font-medium tracking-[0.2em] text-neutral-400 uppercase">
            {viewMode === "swipe" ? "Swipe to Explore" : "Compare Strategies"}
          </p>
        </div>

        <div className="pointer-events-auto">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full border-white/10 bg-white/5 text-white backdrop-blur-md hover:bg-white/10"
            onClick={() => setViewMode((prev) => (prev === "swipe" ? "list" : "swipe"))}
          >
            {viewMode === "swipe" ? <List size={18} /> : <Grid size={18} />}
          </Button>
        </div>
      </div>

      <div className="relative w-full flex-1 pt-32 pb-0">
        <AnimatePresence mode="wait">
          {viewMode === "swipe" && (
            <motion.div
              key="swipe-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative mx-auto flex h-full w-full max-w-md flex-col items-center justify-start"
            >
              {!isFinished ? (
                <div className="relative flex h-[55vh] min-h-[420px] w-full items-center justify-center">
                  {db.map((vault, index) => (
                    <TinderCard
                      ref={childRefs[index]}
                      className="absolute h-full w-[85%] max-w-[320px]"
                      key={vault.id}
                      onSwipe={(dir) => onSwipe(dir, vault.name, index)}
                      onCardLeftScreen={() => onCardLeftScreen(vault.name, index)}
                      preventSwipe={["up", "down"]}
                      swipeRequirementType="position"
                      swipeThreshold={100}
                    >
                      <div
                        onClick={() => handleCardClick(vault.id)}
                        className="group relative h-full w-full cursor-pointer overflow-hidden rounded-[24px] border border-white/10 bg-[#111] shadow-2xl transition-transform select-none active:scale-[0.98]"
                      >
                        <div className="absolute top-4 right-4 z-20">
                          <div className="flex flex-col items-end rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-white shadow-lg backdrop-blur-md">
                            <span className="mb-0.5 text-[8px] leading-none font-bold text-emerald-400 uppercase">
                              APY
                            </span>
                            <span className="font-mono text-base font-bold tracking-tight">
                              +{vault.apy ? vault.apy.toFixed(1) : "12.5"}%
                            </span>
                          </div>
                        </div>
                        <div className="relative h-[45%] w-full overflow-hidden bg-neutral-900">
                          {vault.image_url ? (
                            <img
                              src={vault.image_url}
                              alt={vault.name}
                              className="h-full w-full object-cover opacity-90"
                            />
                          ) : (
                            <div
                              className={`h-full w-full bg-gradient-to-br ${index % 2 === 0 ? "from-indigo-900 to-black" : "from-emerald-900 to-black"} flex items-center justify-center`}
                            >
                              <span className="font-serif text-7xl font-bold text-white/10">
                                {vault.symbol ? vault.symbol[0] : "A"}
                              </span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
                        </div>
                        <div className="flex h-[55%] flex-col justify-between bg-[#111] p-5">
                          <div>
                            <h3 className="mb-1 font-serif text-xl leading-tight font-bold text-white">
                              {vault.name}
                            </h3>
                            <p className="mb-4 font-mono text-[10px] tracking-wider text-neutral-500 uppercase">
                              {vault.symbol} // {vault.creator ? "USER" : "OFFICIAL"}
                            </p>
                            <div className="space-y-2">
                              <p className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest text-neutral-400 uppercase">
                                <TrendingUp size={10} className="text-emerald-500" /> Composition
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {vault.composition?.slice(0, 3).map((comp: any, i: number) => (
                                  <Badge
                                    key={i}
                                    variant="secondary"
                                    className="h-5 border border-white/5 bg-white/5 px-2 text-[9px] text-neutral-300"
                                  >
                                    {comp.token?.symbol || "Unknown"}{" "}
                                    <span className="ml-1 text-emerald-400">{comp.weight}%</span>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-end justify-between border-t border-white/5 pt-3">
                            <div>
                              <span className="mb-0.5 block text-[8px] font-bold text-neutral-600 uppercase">
                                Min Inv.
                              </span>
                              <span className="font-mono text-lg text-white">
                                ${(vault.min_liquidity || 0).toLocaleString()}
                              </span>
                            </div>
                            <ArrowRight size={16} className="text-white" />
                          </div>
                        </div>
                      </div>
                    </TinderCard>
                  ))}

                  <div className="absolute -bottom-20 flex items-center gap-6">
                    <button
                      onClick={() => swipe("left")}
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#111] text-neutral-500 transition-colors hover:text-red-500"
                    >
                      <X size={20} />
                    </button>
                    <button
                      onClick={() => swipe("right")}
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#111] text-neutral-500 transition-colors hover:text-emerald-400"
                    >
                      <Heart size={20} />
                    </button>
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-12 flex max-w-[280px] flex-col items-center justify-center rounded-[12px] border border-white/10 bg-[#111] px-6 py-8 text-center shadow-2xl"
                >
                  <h2 className="mb-2 font-serif text-xl font-bold text-white">All Caught Up</h2>
                  <p className="mb-6 text-[10px] leading-relaxed text-neutral-400">
                    Create your own strategy or
                    <br />
                    compare all vaults in list view.
                  </p>
                  <div className="flex w-full flex-col gap-3">
                    <Button
                      onClick={() => setViewMode("list")}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 text-xs font-bold text-black transition-all hover:bg-emerald-400"
                    >
                      <List size={14} /> Browse All Vaults
                    </Button>
                    <Button
                      onClick={() => router.push("/create")}
                      variant="outline"
                      className="h-10 w-full gap-2 rounded-lg border-white/10 text-xs text-white hover:bg-white/5"
                    >
                      <Sparkles size={14} /> Create with AI
                    </Button>
                    <button
                      onClick={resetCards}
                      className="mt-2 text-[9px] font-bold tracking-widest text-neutral-500 uppercase hover:text-white"
                    >
                      <RotateCcw size={10} className="mr-1 inline" /> Replay
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {viewMode === "list" && (
            <motion.div
              key="list-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mx-auto flex h-full w-full max-w-md flex-col px-4"
            >
              <div className="mb-4 flex items-center justify-between px-2">
                <p className="text-xs font-bold text-neutral-500">{db.length} Vaults Found</p>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-8 w-[110px] rounded-lg border-white/10 bg-white/5 text-[10px] text-white">
                    <ArrowUpDown size={10} className="mr-2" />
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#1c1c1e] text-white">
                    <SelectItem value="apy">Highest APY</SelectItem>
                    <SelectItem value="tvl">Highest TVL</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="-mx-4 flex-1 px-4 pb-20">
                <div className="space-y-3 pb-32">
                  {db.map((vault) => (
                    <div
                      key={vault.id}
                      onClick={() => handleCardClick(vault.id)}
                      className="group flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-[#111] p-4 transition-transform hover:bg-white/5 active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/5 bg-neutral-900">
                          {vault.image_url ? (
                            <img
                              src={vault.image_url}
                              alt=""
                              className="h-full w-full object-cover opacity-80"
                            />
                          ) : (
                            <span className="font-serif text-sm font-bold text-white">
                              {vault.symbol[0]}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="truncate text-sm font-bold text-white">{vault.name}</h4>
                            {vault.apy && vault.apy > 20 && (
                              <Badge className="h-4 border-0 bg-emerald-500/10 px-1 text-[9px] text-emerald-400">
                                Hot
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-neutral-500">
                            <span className="rounded border border-white/5 bg-white/5 px-1.5 py-0.5 text-neutral-400">
                              {vault.symbol}
                            </span>
                            <span>• Min ${vault.min_liquidity?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0 pl-2 text-right">
                        <div className="font-mono text-base leading-tight font-bold text-emerald-400">
                          +{vault.apy ? vault.apy.toFixed(1) : "0.0"}%
                        </div>
                        <div className="mt-0.5 text-[10px] font-medium tracking-wider text-neutral-600 uppercase">
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
