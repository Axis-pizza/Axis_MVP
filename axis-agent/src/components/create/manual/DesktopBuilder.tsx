import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, ArrowLeft, ChevronRight,
  Check, TrendingUp, Loader2, AlertCircle, Percent, X,
} from 'lucide-react';
import { TokenImage } from '../../common/TokenImage';
import { WeightControl } from './WeightControl';
import type { JupiterToken } from '../../../services/jupiter';
import type { AssetItem } from './types';
import type { ManualDashboardHook } from '../../../hooks/useManualDashboard';

// --- Desktop Token List Item ---
const DesktopTokenListItem = ({
  token,
  isSelected,
  onSelect,
}: {
  token: JupiterToken;
  isSelected: boolean;
  onSelect: () => void;
}) => (
  <button
    disabled={isSelected}
    onClick={onSelect}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      isSelected
        ? 'bg-amber-950/40 border border-amber-800/30 cursor-default'
        : 'hover:bg-white/5 active:bg-white/8'
    }`}
  >
    <div className="relative flex-none">
      <TokenImage
        src={token.logoURI}
        className="w-10 h-10 rounded-full bg-white/10"
      />
      {token.isVerified && (
        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
          isSelected ? 'bg-gradient-to-br from-amber-600 to-amber-800' : 'bg-blue-500'
        }`}>
          <Check size={10} className="text-white" />
        </div>
      )}
    </div>

    <div className="flex-1 min-w-0 text-left">
      <div className="flex items-center gap-2">
        <span className={`font-semibold text-sm ${isSelected ? 'text-amber-500' : 'text-white'}`}>
          {token.symbol}
        </span>
        {token.tags?.includes('birdeye-trending') && <TrendingUp size={12} className="text-green-400" />}
        {token.tags?.includes('stable') && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">Stable</span>
        )}
      </div>
      <div className={`text-xs truncate ${isSelected ? 'text-amber-600/50' : 'text-white/40'}`}>
        {token.name}
      </div>
    </div>

    {isSelected ? (
      <div className="flex-none w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center">
        <Check size={14} className="text-white" />
      </div>
    ) : (
      <div className="flex-none w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30 group-hover:text-white/50">
        <Plus size={14} />
      </div>
    )}
  </button>
);

// --- Desktop Asset Card ---
const DesktopAssetCard = ({
  item,
  totalWeight,
  onUpdateWeight,
  onRemove,
}: {
  item: AssetItem;
  totalWeight: number;
  onUpdateWeight: (address: string, value: number) => void;
  onRemove: (address: string) => void;
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -30 }}
    className="relative overflow-hidden rounded-2xl border border-amber-900/20 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-amber-950/10"
  >
    <div className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <TokenImage src={item.token.logoURI} className="w-10 h-10 rounded-full flex-none ring-1 ring-amber-900/30" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm">{item.token.symbol}</div>
          <div className="text-xs text-white/40 truncate">{item.token.name}</div>
        </div>
        <button
          onClick={() => onRemove(item.token.address)}
          className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <WeightControl
        value={item.weight}
        onChange={(val) => onUpdateWeight(item.token.address, val)}
        totalWeight={totalWeight}
      />
    </div>
  </motion.div>
);

// --- Main DesktopBuilder ---
interface DesktopBuilderProps {
  dashboard: ManualDashboardHook;
  onBack?: () => void;
}

export const DesktopBuilder = ({ dashboard, onBack }: DesktopBuilderProps) => {
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
    allTokens,
    tokenFilter,
    setTokenFilter,
    filterCounts,
    handleToIdentity,
    addTokenDirect,
    removeToken,
    updateWeight,
    distributeEvenly,
  } = dashboard;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex-none px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1
            className="text-xl text-white"
            style={{ fontFamily: '"Times New Roman", serif' }}
          >
            Build Strategy
          </h1>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left Column - Selected Tokens (~55%) */}
        <div className="w-[55%] flex flex-col min-h-0 border-r border-white/5">
          {/* Stats Header */}
          <div className="px-6 py-4 flex justify-between items-center border-b border-amber-900/10 bg-gradient-to-r from-[#050505] to-amber-950/5">
            <div className="flex items-center gap-4">
              <div className={`relative w-16 h-16 rounded-2xl flex flex-col items-center justify-center overflow-hidden ${
                totalWeight === 100
                  ? 'bg-gradient-to-br from-emerald-900/50 to-emerald-950/80 ring-1 ring-emerald-700/30'
                  : totalWeight > 100
                    ? 'bg-gradient-to-br from-red-900/50 to-red-950/80 ring-1 ring-red-700/30'
                    : 'bg-gradient-to-br from-amber-900/30 to-[#0a0a0a] ring-1 ring-amber-800/20'
              }`}>
                <span
                  className={`text-2xl ${
                    totalWeight === 100 ? 'text-emerald-400' :
                    totalWeight > 100 ? 'text-red-400' : 'text-amber-500'
                  }`}
                  style={{ fontFamily: '"Times New Roman", serif' }}
                >
                  {totalWeight}
                </span>
                <span className="text-[10px] text-white/40 -mt-1">%</span>
              </div>

              <div>
                <div className="text-xs text-amber-700/70 font-medium uppercase tracking-wider">Total</div>
                <div className="text-sm mt-1">
                  {totalWeight === 100 ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <Check size={14} /> Complete
                    </span>
                  ) : totalWeight > 100 ? (
                    <span className="text-red-400">+{totalWeight - 100}% over</span>
                  ) : (
                    <span className="text-white/50">{100 - totalWeight}% left</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {portfolio.length >= 2 && (
                <button
                  onClick={distributeEvenly}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-amber-900/20 text-amber-600 hover:bg-amber-900/30 transition-colors border border-amber-800/20"
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            <AnimatePresence>
              {totalWeight > 100 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-950/30 border border-red-900/30 text-red-400 text-sm"
                >
                  <AlertCircle size={18} />
                  <span>Total exceeds 100%</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="popLayout">
              {portfolio.map(item => (
                <DesktopAssetCard
                  key={item.token.address}
                  item={item}
                  totalWeight={totalWeight}
                  onUpdateWeight={updateWeight}
                  onRemove={removeToken}
                />
              ))}
            </AnimatePresence>

            {portfolio.length === 0 && (
              <div className="h-48 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-amber-900/30 flex items-center justify-center bg-amber-950/10">
                  <Plus size={28} className="text-amber-800/50" />
                </div>
                <span className="text-sm text-amber-900/50">Select tokens from the right panel</span>
              </div>
            )}
          </div>

          {/* Next Button */}
          <div className="p-4 border-t border-white/5">
            <button
              onClick={handleToIdentity}
              disabled={!isValidAllocation}
              className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                isValidAllocation
                  ? 'bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-black hover:brightness-110'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              Next <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Right Column - Token Browser (~45%) */}
        <div className="w-[45%] flex flex-col min-h-0 bg-[#0a0a0a]">
          {/* Search */}
          <div className="px-4 py-4 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-800/50" size={18} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tokens..."
                className="w-full bg-amber-950/20 border border-amber-900/20 rounded-xl pl-11 pr-10 py-3 text-sm focus:border-amber-700/50 focus:bg-amber-950/30 outline-none transition-all placeholder:text-amber-900/40 text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10"
                >
                  <X size={14} className="text-white/40" />
                </button>
              )}
              {isSearching && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 text-amber-600 animate-spin" size={16} />}
            </div>

            <div className="flex justify-between items-center mt-2 px-1">
              <span className="text-xs text-amber-800/40">
                {searchQuery ? `${displayTokens.length} results` : `${allTokens.length.toLocaleString()} tokens`}
              </span>
              {hasSelection && (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <Check size={12} />
                  {portfolio.length} selected
                </span>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar">
              {([
                { key: 'all', label: 'All', count: 1 },
                { key: 'crypto', label: 'Crypto', count: filterCounts.crypto },
                { key: 'stock', label: 'Stock', count: filterCounts.stock },
                { key: 'commodity', label: 'Commodities', count: filterCounts.commodity },
                { key: 'prediction', label: 'Prediction', count: filterCounts.prediction },
              ] as const).map(({ key, label, count }) => (
                count === undefined || count > 0 ? (
                  <button
                    key={key}
                    onClick={() => setTokenFilter(key)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      tokenFilter === key
                        ? 'bg-amber-600 text-black'
                        : 'bg-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ) : null
              ))}
            </div>
          </div>

          {/* Token List */}
          <div className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                <span className="text-sm text-amber-800/50">Loading tokens...</span>
              </div>
            ) : sortedVisibleTokens.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-amber-800/30">
                <Search size={32} strokeWidth={1.5} />
                <span className="text-sm">No tokens found</span>
              </div>
            ) : (
              <div className="space-y-0.5 pt-1">
                {hasSelection && !searchQuery && (
                  <div className="px-3 pt-2 pb-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-amber-700/50">
                      Selected
                    </span>
                  </div>
                )}

                {sortedVisibleTokens.map((token, index) => {
                  const isSelected = selectedIds.has(token.address);
                  const showDivider = hasSelection && !searchQuery && index === portfolio.length && index > 0;

                  return (
                    <div key={token.address}>
                      {showDivider && (
                        <div className="px-3 pt-4 pb-1 flex items-center gap-3">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-white/20">
                            Available
                          </span>
                          <div className="flex-1 h-px bg-gradient-to-r from-amber-900/20 to-transparent" />
                        </div>
                      )}
                      <DesktopTokenListItem
                        token={token}
                        isSelected={isSelected}
                        onSelect={() => addTokenDirect(token)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
