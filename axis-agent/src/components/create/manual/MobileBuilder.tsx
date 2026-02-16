import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Search, ArrowLeft, ChevronRight, Check, Loader2, AlertCircle, Percent, X, Plus, ClipboardPaste } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TokenImage } from '../../common/TokenImage';
import { MobileAssetCard, MobileTokenListItem } from './MobileComponents';
import { TabSelector } from './TabSelector';
import { PredictionEventCard } from './PredictionEventCard'; 
import type { JupiterToken } from '../../../services/jupiter';
import type { BuilderProps } from './types';
import { StockTokenCard } from './StockTokenCard';

export const MobileBuilder = ({ dashboard, preferences, onBack }: BuilderProps) => {
  const {
    portfolio,
    searchQuery,
    setSearchQuery,
    isSearching,
    isLoading,
    totalWeight,
    selectedIds,
    hasSelection,
    isValidAllocation,
    sortedVisibleTokens,
    groupedPredictions, // Hookから計算済みデータを受け取る
    handleAnimationComplete,
    removeToken,
    updateWeight,
    distributeEvenly,
    triggerHaptic,
    handleToIdentity,
    activeTab,
    setActiveTab,
    flyingToken,
    flyingCoords,
  } = dashboard;

  const { publicKey } = useWallet();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  
  const mobileVirtualizer = useVirtualizer({
    count: sortedVisibleTokens.length,
    getScrollElement: () => mobileScrollRef.current,
    estimateSize: () => 68, 
    overscan: 5,
  });

  const handleToIdentityMobile = useCallback(() => {
    setIsSelectorOpen(false);
    handleToIdentity();
  }, [handleToIdentity]);

  // トークン選択時の処理（安全策を追加）
  const handleTokenSelect = useCallback((token: JupiterToken) => {
    try {
      // 1. 履歴に追加
      preferences.addToSearchHistory({
        address: token.address,
        symbol: token.symbol,
        logoURI: token.logoURI,
      });

      // 2. トークンを追加
      dashboard.addTokenDirect(token);
      triggerHaptic();
      
      // 3. モーダルを即座に強制的に閉じる
      setIsSelectorOpen(false); 
      setSearchQuery('');
    } catch (e) {
      console.error("Selection Error:", e);
      // エラーでも最低限モーダルは閉じる
      setIsSelectorOpen(false); 
    }
  }, [dashboard, triggerHaptic, preferences, setSearchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (searchQuery) setSearchQuery('');
        else setIsSelectorOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, setSearchQuery]);

  const handlePasteCA = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length >= 32) setSearchQuery(text.trim());
    } catch { /* clipboard denied */ }
  }, [setSearchQuery]);

  useEffect(() => {
    if (portfolio.length === 0 && !isSelectorOpen) setIsSelectorOpen(true);
  }, []);

  return (
    <div className="absolute inset-0 bg-[#030303] flex flex-col">
      
      {/* 1. Header (Fixed Top) */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-0 left-0 right-0 z-30 bg-[#030303]/90 backdrop-blur-md border-b border-white/5 safe-area-top"
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center active:bg-white/10 transition-colors"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
          </div>
          
          <button
            onClick={() => setIsSelectorOpen(true)}
            className="w-10 h-10 bg-[#B8863F]/10 rounded-full flex items-center justify-center text-[#B8863F] active:bg-[#B8863F]/20 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
      </motion.div>

      {/* 2. Scrollable Content Area */}
      <div className="absolute inset-0 top-0 bottom-0 overflow-y-auto custom-scrollbar z-0">
        <div className="h-[64px] safe-area-top" />

        {/* Stats Header (Sticky) */}
        <div className="sticky top-0 z-20 bg-[#030303]/95 border-b border-white/5 backdrop-blur-sm shadow-lg shadow-black/20 px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className={`relative w-16 h-16 rounded-2xl flex flex-col items-center justify-center overflow-hidden border ${
                totalWeight === 100
                  ? 'bg-emerald-900/20 border-emerald-500/30'
                  : totalWeight > 100
                    ? 'bg-red-900/20 border-red-500/30'
                    : 'bg-amber-900/10 border-amber-500/20'
              }`}>
                <span
                  className={`text-2xl font-bold ${
                    totalWeight === 100 ? 'text-emerald-400' :
                    totalWeight > 100 ? 'text-red-400' : 'text-amber-500'
                  }`}
                >
                  {totalWeight}
                </span>
                <span className="text-[10px] text-white/40 -mt-1">%</span>
              </div>

              <div>
                <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Allocation</div>
                <div className="text-sm font-medium mt-0.5">
                  {totalWeight === 100 ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check size={14} /> Ready
                    </span>
                  ) : totalWeight > 100 ? (
                    <span className="text-red-400">Over limit</span>
                  ) : (
                    <span className="text-amber-500/80">{100 - totalWeight}% remaining</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {portfolio.length >= 2 && (
                <button
                  onClick={distributeEvenly}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-white/5 text-white/70 active:bg-white/10 transition-colors"
                >
                  <Percent size={12} />
                  Equal
                </button>
              )}
              <div className="text-xs text-white/30 font-mono">
                {portfolio.length} Asset{portfolio.length !== 1 ? 's' : ''}
              </div>
            </div>
        </div>

        {/* Portfolio List */}
        <div className="p-4 space-y-3 pb-40">
            <AnimatePresence>
              {totalWeight > 100 && (
                <motion.div
                  key="error-banner"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium mb-2"
                >
                  <AlertCircle size={16} />
                  <span>Allocation exceeds 100%</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="popLayout">
              {portfolio.map(item => (
                <MobileAssetCard
                  key={item.token.address}
                  item={item}
                  totalWeight={totalWeight}
                  onUpdateWeight={updateWeight}
                  onRemove={removeToken}
                />
              ))}
            </AnimatePresence>

            <motion.button
              layout
              onClick={() => setIsSelectorOpen(true)}
              className="w-full py-6 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-white/30 active:bg-white/5 transition-colors bg-white/[0.02]"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shadow-inner">
                <Plus size={24} />
              </div>
              <span className="text-sm font-medium">Tap to add asset</span>
            </motion.button>
        </div>
      </div>

      {/* 3. FAB - Add Token */}
      {!isSelectorOpen && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-6 right-6 z-40 safe-area-bottom"
        >
          <button
            onClick={() => setIsSelectorOpen(true)}
            className="w-14 h-14 bg-[#B8863F] rounded-full shadow-lg shadow-amber-900/40 flex items-center justify-center text-black active:scale-95 transition-transform"
          >
            <Plus size={28} />
          </button>
        </motion.div>
      )}

      {/* 4. Next Step FAB */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] z-30 pointer-events-none">
        <AnimatePresence>
          {isValidAllocation && !isSelectorOpen && (
            <motion.button
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={handleToIdentityMobile}
              className="w-full h-14 bg-gradient-to-r from-amber-600 to-amber-700 text-black font-bold text-lg rounded-full shadow-xl shadow-black/50 flex items-center justify-center gap-2 pointer-events-auto active:scale-[0.98] transition-transform"
            >
              Next Step <ChevronRight size={20} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* 5. Centered Token Selector Modal (アニメーションなし・安全版) */}
      {/* AnimatePresenceを削除し、条件分岐のみで制御。幽霊要素の発生を100%防ぐ。 */}
      {isSelectorOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center"
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsSelectorOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-sm px-4 sm:px-6 pointer-events-auto safe-area-bottom safe-area-top">
            <div className="w-full bg-[#121212] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[70vh]">
                {/* Modal Header */}
                <div className="shrink-0 bg-[#121212] border-b border-white/5 p-4 pb-3">
                  <div className="flex items-center gap-3 mb-3">
                      <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                          <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search name or address"
                            className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-10 py-3 text-base text-white placeholder:text-white/30 focus:border-[#B8863F]/50 focus:bg-white/10 outline-none transition-all"
                            autoFocus
                          />
                          {searchQuery ? (
                          <button
                              onClick={() => setSearchQuery('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/10 text-white/50"
                          >
                              <X size={14} />
                          </button>
                          ) : (
                          <button
                              onClick={handlePasteCA}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-white/40 active:text-white"
                          >
                              <ClipboardPaste size={14} />
                          </button>
                          )}
                      </div>
                      
                      <button 
                          onClick={() => setIsSelectorOpen(false)}
                          className="p-3 rounded-full bg-white/5 text-white/70 active:bg-white/10 transition-colors"
                      >
                          <X size={20} />
                      </button>
                  </div>

                  <TabSelector
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      isWalletConnected={!!publicKey}
                  />
                </div>

                {/* Token List */}
                <div
                  ref={mobileScrollRef}
                  className="flex-1 overflow-y-auto bg-[#121212] custom-scrollbar"
                >
                  {!searchQuery && preferences.favorites.size > 0 && activeTab !== 'prediction' && (
                    <div className="px-4 py-3 border-b border-white/5">
                      <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-2 block">Starred</span>
                      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                        {dashboard.allTokens.filter(t => preferences.favorites.has(t.address)).map(token => (
                          <button
                            key={token.address}
                            onClick={() => handleTokenSelect(token)}
                            className="flex flex-col items-center gap-1.5 min-w-[64px]"
                          >
                            <div className="relative">
                              <TokenImage src={token.logoURI} className="w-12 h-12 rounded-full bg-white/10 border border-white/5" />
                              {selectedIds.has(token.address) && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-[#121212]">
                                  <Check size={10} className="text-white" />
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-white/70 font-medium truncate w-full text-center">{token.symbol}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                      <Loader2 className="w-8 h-8 text-[#B8863F] animate-spin" />
                      <span className="text-sm text-white/30">Loading tokens...</span>
                    </div>
                  ) : activeTab === 'prediction' ? (
                    // --- Prediction専用ビュー (Mobile) ---
                    <div className="px-3 pt-4 pb-10">
                      {groupedPredictions.map(group => (
                        <PredictionEventCard 
                          key={`pred-${group.marketId}`} 
                          group={group} 
                          // boolean判定の結果だけを渡して再描画を最小化
                          isYesSelected={group.yesToken ? selectedIds.has(group.yesToken.address) : false}
                          isNoSelected={group.noToken ? selectedIds.has(group.noToken.address) : false}
                          onSelect={handleTokenSelect}
                        />
                      ))}
                      {groupedPredictions.length === 0 && (
                        <div className="text-center py-20 text-white/20 text-sm">No predictions found</div>
                      )}
                    </div>

                    ) : activeTab === 'stock' ? (
                      // ★★★ ここを追加: Stock専用グリッドビュー ★★★
                      <div className="px-3 pt-4 pb-10">
                        {sortedVisibleTokens.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/20">
                            <Search size={32} />
                            <span className="text-sm">No stocks found</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {sortedVisibleTokens.map((token) => (
                              <StockTokenCard
                                key={token.address}
                                token={token}
                                isSelected={selectedIds.has(token.address)}
                                onSelect={() => handleTokenSelect(token)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : sortedVisibleTokens.length === 0 ? (
                  
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/20">
                      <Search size={32} />
                      <span className="text-sm">No tokens found</span>
                    </div>
                  ) : (
                    // --- 通常のリストビュー ---
                    <div
                      style={{
                        height: `${mobileVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                      }}
                    >
                      {mobileVirtualizer.getVirtualItems().map((virtualRow) => {
                        const token = sortedVisibleTokens[virtualRow.index];
                        // ここで boolean 判定を行う
                        const isSelected = selectedIds.has(token.address);
                        return (
                          <div
                            key={token.address}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: `${virtualRow.size}px`,
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            <div className="px-2 py-1">
                              <MobileTokenListItem
                                token={token}
                                isSelected={isSelected}
                                hasSelection={hasSelection}
                                onSelect={() => handleTokenSelect(token)}
                                isFavorite={preferences.isFavorite(token.address)}
                                onToggleFavorite={() => preferences.toggleFavorite(token.address)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Flying Particle (Keep animation here) */}
      <AnimatePresence>
        {flyingToken && (
          <motion.div
            key="flying-particle"
            initial={{ position: 'fixed', left: flyingCoords?.x, top: flyingCoords?.y, x: "-50%", y: "-50%", scale: 1, opacity: 1 }}
            animate={{ left: "50%", top: "15%", scale: 0.2, opacity: 0 }}
            transition={{ duration: 0.5, ease: "circOut" }}
            onAnimationComplete={handleAnimationComplete}
            className="z-[100] pointer-events-none"
          >
            <TokenImage src={flyingToken.logoURI} className="w-12 h-12 rounded-full shadow-xl shadow-[#B8863F]/50 ring-2 ring-[#B8863F]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};