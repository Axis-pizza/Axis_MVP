import { useState, useCallback } from 'react';
import { motion, AnimatePresence, type PanInfo, type Variants, useDragControls } from 'framer-motion';
import { Search, ArrowLeft, ChevronRight, Check, Loader2, AlertCircle, Percent, X, Plus } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { TokenImage } from '../../common/TokenImage';
import { MobileAssetCard, MobileTokenListItem } from './MobileComponents';
import { TabSelector } from './TabSelector';
import type { JupiterToken } from '../../../services/jupiter';
import type { ExtendedDashboardHook } from './types';

const drawerVariants: Variants = {
  hidden: { y: "100%" },
  visible: { y: "45%", transition: { type: "spring", damping: 25, stiffness: 200, mass: 0.8, delay: 0.2 } },
  full: { y: "5%", transition: { type: "spring", damping: 25, stiffness: 200 } },
  closed: { y: "calc(100% - 100px)", transition: { type: "spring", damping: 25, stiffness: 200 } },
};

interface MobileBuilderProps {
  dashboard: ExtendedDashboardHook;
  onBack?: () => void;
}

export const MobileBuilder = ({ dashboard, onBack }: MobileBuilderProps) => {
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
    displayTokens,
    flyingToken,
    activeTab,
    setActiveTab,
    triggerAddAnimation,
    handleAnimationComplete,
    removeToken,
    updateWeight,
    distributeEvenly,
    triggerHaptic,
    handleToIdentity,
    tokenFilter,
    setTokenFilter,
    filterCounts,
  } = dashboard;

  const { publicKey } = useWallet();
  const dragControls = useDragControls();
  const [drawerState, setDrawerState] = useState<'closed' | 'half' | 'full'>('half');

  const handleToIdentityMobile = useCallback(() => {
    setDrawerState('closed');
    handleToIdentity();
  }, [handleToIdentity]);

  const handleTokenSelect = useCallback((token: JupiterToken) => {
    const el = document.querySelector(`[data-token="${token.address}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      triggerAddAnimation(token, rect);
    } else {
      dashboard.addTokenDirect(token);
      triggerHaptic();
    }
  }, [triggerAddAnimation, dashboard, triggerHaptic]);

  return (
    <>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex-none px-4 py-3 flex items-center justify-between z-30 bg-black border-b border-white/5 safe-area-top"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-11 h-11 bg-white/5 rounded-full flex items-center justify-center active:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
      </motion.div>

      {/* Main Builder Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 bg-[#050505] flex flex-col relative z-0 min-h-0">
          {/* Stats Header */}
          <div className="px-4 py-4 flex justify-between items-center border-b border-amber-900/10 bg-gradient-to-r from-[#050505] to-amber-950/10 z-10 sticky top-0">
            <div className="flex items-center gap-4">
              <div className={`relative w-20 h-20 rounded-2xl flex flex-col items-center justify-center overflow-hidden ${
                totalWeight === 100
                  ? 'bg-gradient-to-br from-emerald-900/50 to-emerald-950/80 ring-1 ring-emerald-700/30'
                  : totalWeight > 100
                    ? 'bg-gradient-to-br from-red-900/50 to-red-950/80 ring-1 ring-red-700/30'
                    : 'bg-gradient-to-br from-amber-900/30 to-[#0a0a0a] ring-1 ring-amber-800/20'
              }`}>
                <span
                  className={`text-3xl ${
                    totalWeight === 100 ? 'text-emerald-400' :
                    totalWeight > 100 ? 'text-red-400' : 'text-amber-500'
                  }`}
                  style={{ fontFamily: '"Times New Roman", serif' }}
                >
                  {totalWeight}
                </span>
                <span className="text-xs text-white/40 -mt-1">%</span>
              </div>

              <div>
                <div className="text-xs text-amber-700/70 font-medium uppercase tracking-wider">Total</div>
                <div className="text-base mt-1">
                  {totalWeight === 100 ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <Check size={16} /> Complete
                    </span>
                  ) : totalWeight > 100 ? (
                    <span className="text-red-400">+{totalWeight - 100}% over</span>
                  ) : (
                    <span className="text-white/50">{100 - totalWeight}% left</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {portfolio.length >= 2 && (
                <button
                  onClick={distributeEvenly}
                  className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-amber-900/20 text-amber-600 active:bg-amber-900/30 transition-colors border border-amber-800/20"
                >
                  <Percent size={14} />
                  Equal
                </button>
              )}
              <div
                className="text-sm text-amber-700/50"
                style={{ fontFamily: '"Times New Roman", serif' }}
              >
                {portfolio.length} asset{portfolio.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Portfolio List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar pb-48 overscroll-contain">
            <AnimatePresence>
              {totalWeight > 100 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-red-950/30 border border-red-900/30 text-red-400 text-sm"
                >
                  <AlertCircle size={20} />
                  <span>Total exceeds 100%</span>
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

            {portfolio.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="h-48 flex flex-col items-center justify-center gap-4"
              >
                <div className="w-20 h-20 rounded-3xl border-2 border-dashed border-amber-900/30 flex items-center justify-center bg-amber-950/10">
                  <Plus size={32} className="text-amber-800/50" />
                </div>
                <span className="text-base text-amber-900/50">Select tokens from below</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Token Selector Drawer */}
      <motion.div
        variants={drawerVariants}
        initial="hidden"
        animate={drawerState === 'closed' ? "closed" : drawerState === 'half' ? "visible" : "full"}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.05}
        onDragEnd={(_: unknown, info: PanInfo) => {
          const { offset, velocity } = info;
          if (drawerState === 'half' && (offset.y > 100 || velocity.y > 500)) setDrawerState('closed');
          else if (drawerState === 'half' && (offset.y < -100 || velocity.y < -500)) setDrawerState('full');
          else if (drawerState === 'closed' && (offset.y < -50 || velocity.y < -500)) setDrawerState('half');
          else if (drawerState === 'full' && (offset.y > 100 || velocity.y > 500)) setDrawerState('half');
        }}
        className="absolute top-0 bottom-0 left-0 right-0 bg-[#0a0a0a] rounded-t-[32px] shadow-[0_-10px_60px_rgba(180,83,9,0.15)] z-20 flex flex-col border-t border-amber-900/30"
      >
        {/* Drag Handle */}
        <div
          className="flex justify-center py-4 cursor-grab active:cursor-grabbing touch-none w-full"
          onPointerDown={(e) => dragControls.start(e)}
          onClick={() => setDrawerState(prev => prev === 'closed' ? 'half' : prev === 'half' ? 'full' : 'closed')}
        >
          <div className={`w-14 h-1.5 rounded-full transition-colors ${
            drawerState === 'closed'
              ? 'bg-gradient-to-r from-amber-700 to-amber-600'
              : 'bg-white/30'
          }`} />
        </div>

        {/* Search */}
        <div className="px-4 pb-2 shrink-0">
          <div className="relative mb-4">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-800/50" size={20} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setDrawerState('full')}
              placeholder="Search tokens..."
              className="w-full bg-amber-950/20 border border-amber-900/20 rounded-2xl pl-14 pr-12 py-4 text-base focus:border-amber-700/50 focus:bg-amber-950/30 outline-none transition-all placeholder:text-amber-900/40 text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full active:bg-white/10"
              >
                <X size={18} className="text-white/40" />
              </button>
            )}
            {isSearching && <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 text-amber-600 animate-spin" size={18} />}
          </div>

          <TabSelector 
             activeTab={activeTab} 
             setActiveTab={setActiveTab} 
             isWalletConnected={!!publicKey} 
          />
          
          {/* Sub Filters for All Tab */}
          {activeTab === 'all' && (
            <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
              {([
                { key: 'crypto', label: 'Crypto', count: filterCounts.crypto },
                { key: 'stock', label: 'Stock', count: filterCounts.stock },
                { key: 'commodity', label: 'Commodities', count: filterCounts.commodity },
                { key: 'prediction', label: 'Prediction', count: filterCounts.prediction },
              ] as const).map(({ key, label, count }) => (
                count === undefined || count > 0 ? (
                  <button
                    key={key}
                    onClick={() => setTokenFilter(prev => prev === key ? 'all' : key)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                      tokenFilter === key
                        ? 'bg-amber-600 text-black'
                        : 'bg-white/5 text-white/40 active:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ) : null
              ))}
            </div>
          )}
        </div>

        {/* Token List */}
        <div
          className="flex-1 overflow-y-auto px-3 pb-8 custom-scrollbar overscroll-contain"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-4">
              <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
              <span className="text-base text-amber-800/50">Loading tokens...</span>
            </div>
          ) : sortedVisibleTokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-amber-800/30">
              <Search size={40} strokeWidth={1.5} />
              <span className="text-base">No tokens found</span>
            </div>
          ) : (
            <div className="space-y-1">
              {sortedVisibleTokens.map((token, index) => {
                const isSelected = selectedIds.has(token.address);
                return (
                  <MobileTokenListItem
                    key={`${token.address}-${index}`}
                    token={token}
                    isSelected={isSelected}
                    hasSelection={hasSelection}
                    onSelect={() => handleTokenSelect(token)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Flying Particle */}
      <AnimatePresence>
        {flyingToken && (
          <motion.div
            initial={{ position: 'fixed', left: flyingToken.x, top: flyingToken.y, x: "-50%", y: "-50%", scale: 1, opacity: 1 }}
            animate={{ left: "50%", top: "20%", scale: 0.3, opacity: 0 }}
            transition={{ duration: 0.4, ease: "backIn" }}
            onAnimationComplete={handleAnimationComplete}
            className="z-50 pointer-events-none"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-900 to-amber-950 border-2 border-amber-700 flex items-center justify-center overflow-hidden shadow-xl shadow-amber-900/50">
              <TokenImage src={flyingToken.token.logoURI} className="w-full h-full object-cover" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <div className="absolute bottom-0 left-0 right-0 p-5 pb-8 z-50 pointer-events-none safe-area-bottom">
        <AnimatePresence>
          {isValidAllocation && (
            <motion.button
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={handleToIdentityMobile}
              className="w-full py-5 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-black font-bold text-lg rounded-2xl shadow-xl shadow-amber-900/40 flex items-center justify-center gap-3 pointer-events-auto active:scale-[0.98] transition-transform"
            >
              Next <ChevronRight size={22} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};