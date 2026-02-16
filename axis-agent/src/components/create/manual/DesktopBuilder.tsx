import { useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion'; // motion を追加
import { Search, ArrowLeft, ChevronRight, Check, Loader2, AlertCircle, Percent, X, Sparkles, Plus, Star, ClipboardPaste } from 'lucide-react'; // ChevronRight を追加
import { useWallet } from '@solana/wallet-adapter-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TokenImage } from '../../common/TokenImage';
import { WeightControl } from './WeightControl';
import { TabSelector } from './TabSelector';
import { PredictionEventCard } from './PredictionEventCard';
import { StockTokenCard } from './StockTokenCard';
import { formatCompactUSD, abbreviateAddress } from '../../../utils/formatNumber';
import type { JupiterToken } from '../../../services/jupiter';
import type { AssetItem, BuilderProps } from './types';

// --- Desktop Sub Components ---

const DesktopTokenListItem = ({
  token,
  isSelected,
  onSelect,
  isFavorite,
  onToggleFavorite,
}: {
  token: JupiterToken;
  isSelected: boolean;
  onSelect: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) => (
  <button
    disabled={isSelected}
    onClick={onSelect}
    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all group ${
      isSelected
        ? 'bg-amber-950/40 border border-amber-800/30 cursor-default'
        : 'hover:bg-white/5'
    }`}
  >
    {/* Star */}
    {onToggleFavorite && (
      <div
        role="button"
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className="flex-none w-5 flex items-center justify-center"
      >
        <Star
          size={12}
          className={`transition-colors ${isFavorite ? 'text-amber-500 fill-amber-500' : 'text-white/15 group-hover:text-white/25'}`}
        />
      </div>
    )}

    {/* Icon + Badge */}
    <div className="relative flex-none">
      <TokenImage src={token.logoURI} className="w-9 h-9 rounded-full bg-white/10" />
      {token.isVerified && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-[#0a0a0a]">
          <Check size={8} className="text-white" />
        </div>
      )}
    </div>

    {/* Name block */}
    <div className="flex-1 min-w-0 text-left">
      <div className="flex items-center gap-1.5">
        <span className={`font-bold text-sm ${isSelected ? 'text-amber-400' : 'text-white'}`}>
          {token.symbol}
        </span>
        {token.tags?.includes('meme') && <Sparkles size={10} className="text-pink-400" />}
        {token.tags?.includes('stable') && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">Stable</span>
        )}
      </div>
      <div className="text-[11px] text-white/30 truncate">
        {token.name}
        <span className="text-white/15 mx-1">·</span>
        <span className="font-mono text-white/20">{abbreviateAddress(token.address)}</span>
      </div>
    </div>

    {/* Right: Balance or MC/VOL */}
    {token.balance != null && token.balance > 0 ? (
      <div className="text-right flex-none min-w-[60px]">
        <div className="text-xs font-mono text-white/80">
          {token.balance < 0.001 ? '<0.001' : token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
        </div>
        <div className="text-[10px] text-white/25">Balance</div>
      </div>
    ) : (
      <div className="flex items-center gap-2 flex-none">
        <div className="text-right w-[50px]">
          <div className="text-[9px] text-white/25 uppercase leading-none mb-0.5">MC</div>
          <div className="text-[11px] text-white/50 font-mono leading-none">{formatCompactUSD(token.marketCap)}</div>
        </div>
        <div className="text-right w-[50px]">
          <div className="text-[9px] text-white/25 uppercase leading-none mb-0.5">VOL</div>
          <div className="text-[11px] text-white/50 font-mono leading-none">{formatCompactUSD(token.dailyVolume)}</div>
        </div>
      </div>
    )}

    {/* Add/Check */}
    <div className={`flex-none w-7 h-7 rounded-full flex items-center justify-center ${
      isSelected
        ? 'bg-gradient-to-br from-amber-600 to-amber-800'
        : 'bg-white/5 text-white/30 group-hover:text-white/50'
    }`}>
      {isSelected ? <Check size={12} className="text-white" /> : <Plus size={12} />}
    </div>
  </button>
);

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
  <div className="relative overflow-hidden rounded-2xl border border-amber-900/20 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-amber-950/10">
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
  </div>
);

// --- Main DesktopBuilder ---

export const DesktopBuilder = ({ dashboard, preferences, onBack }: BuilderProps) => {
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
    groupedPredictions,
    allTokens,
    activeTab,
    setActiveTab,
    tokenFilter,
    setTokenFilter,
    filterCounts,
    handleToIdentity,
    addTokenDirect,
    removeToken,
    updateWeight,
    distributeEvenly,
  } = dashboard;

  const { publicKey } = useWallet();

  // Virtual scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: sortedVisibleTokens.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  // Esc key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchQuery) setSearchQuery('');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, setSearchQuery]);

  // Paste CA handler
  const handlePasteCA = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length >= 32) {
        setSearchQuery(text.trim());
      }
    } catch { /* clipboard denied */ }
  }, [setSearchQuery]);

  // Token select with search history recording
  const handleTokenSelect = useCallback((token: JupiterToken) => {
    preferences.addToSearchHistory({
      address: token.address,
      symbol: token.symbol,
      logoURI: token.logoURI,
    });
    addTokenDirect(token);
  }, [addTokenDirect, preferences]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-none px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl text-white" style={{ fontFamily: '"Times New Roman", serif' }}>
            Build Strategy
          </h1>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left Panel: Portfolio */}
        <div className="w-[55%] flex flex-col min-h-0 border-r border-white/5">
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
              <div className="text-sm text-amber-700/50" style={{ fontFamily: '"Times New Roman", serif' }}>
                {portfolio.length} asset{portfolio.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            <AnimatePresence>
              {totalWeight > 100 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-950/30 border border-red-900/30 text-red-400 text-sm">
                  <AlertCircle size={18} />
                  <span>Total exceeds 100%</span>
                </div>
              )}
            </AnimatePresence>

            {portfolio.map(item => (
              <DesktopAssetCard
                key={item.token.address}
                item={item}
                totalWeight={totalWeight}
                onUpdateWeight={updateWeight}
                onRemove={removeToken}
              />
            ))}

            {portfolio.length === 0 && (
              <div className="h-48 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-amber-900/30 flex items-center justify-center bg-amber-950/10">
                  <Plus size={28} className="text-amber-800/50" />
                </div>
                <span className="text-sm text-amber-900/50">Select tokens from the right panel</span>
              </div>
            )}
          </div>

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

        {/* Right Panel: Token Selector */}
        <div className="w-[45%] flex flex-col min-h-0 bg-[#0a0a0a]">
          <div className="px-4 py-4 border-b border-white/5">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-800/50" size={18} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, symbol, or paste address..."
                className="w-full bg-amber-950/20 border border-amber-900/20 rounded-xl pl-11 pr-24 py-3 text-sm focus:border-amber-700/50 focus:bg-amber-950/30 outline-none transition-all placeholder:text-amber-900/40 text-white"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isSearching && <Loader2 className="text-amber-600 animate-spin" size={14} />}
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10"
                  >
                    <X size={14} className="text-white/40" />
                  </button>
                ) : (
                  <button
                    onClick={handlePasteCA}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-900/30 text-amber-500 text-[11px] font-bold hover:bg-amber-900/50 transition-colors"
                  >
                    <ClipboardPaste size={11} />
                    Paste
                  </button>
                )}
              </div>
            </div>

            {/* Search History Chips */}
            {!searchQuery && preferences.searchHistory.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[10px] text-white/25 uppercase tracking-wider font-bold">Recent</span>
                  <button
                    onClick={preferences.clearSearchHistory}
                    className="text-[10px] text-amber-700/50 hover:text-amber-500 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {preferences.searchHistory.map(item => (
                    <button
                      key={item.address}
                      onClick={() => setSearchQuery(item.symbol !== '?' ? item.symbol : item.address)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 shrink-0 hover:bg-white/10 border border-white/5 transition-colors"
                    >
                      <TokenImage src={item.logoURI} className="w-3.5 h-3.5 rounded-full" />
                      <span className="text-[10px] text-white/60 font-medium">{item.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <TabSelector 
               activeTab={activeTab} 
               setActiveTab={setActiveTab} 
               isWalletConnected={!!publicKey} 
            />

            <div className="flex justify-between items-center mt-2 px-1">
              <span className="text-xs text-amber-800/40">
                {searchQuery ? `${allTokens.length.toLocaleString()} tokens` : `${allTokens.length.toLocaleString()} tokens`}
              </span>
              {hasSelection && (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <Check size={12} />
                  {portfolio.length} selected
                </span>
              )}
            </div>

            {/* Sub Filters + Verified Only Toggle */}
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-1.5 cursor-pointer shrink-0 ml-2">
                <span className="text-[10px] text-white/30 font-bold">Verified</span>
                <div
                  className={`relative w-7 h-4 rounded-full transition-colors ${
                    preferences.verifiedOnly ? 'bg-amber-600' : 'bg-white/10'
                  }`}
                  onClick={() => preferences.setVerifiedOnly(!preferences.verifiedOnly)}
                >
                  <motion.div
                    className="absolute top-[2px] w-3 h-3 rounded-full bg-white shadow-sm"
                    animate={{ left: preferences.verifiedOnly ? 13 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </div>
              </label>
            </div>
          </div>

          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
            {/* Favorites Bar */}
            {!searchQuery && preferences.favorites.size > 0 && activeTab !== 'prediction' && activeTab !== 'stock' && (
              <div className="px-2 py-2 mb-1 border-b border-white/5">
                <span className="text-[10px] text-white/25 uppercase tracking-wider font-bold mb-1.5 block px-1">Favorites</span>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {dashboard.allTokens.filter(t => preferences.favorites.has(t.address)).map(token => (
                    <button
                      key={token.address}
                      onClick={() => handleTokenSelect(token)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg shrink-0 border transition-colors ${
                        selectedIds.has(token.address)
                          ? 'bg-amber-900/30 border-amber-800/30 opacity-50'
                          : 'bg-white/[0.03] border-white/5 hover:bg-white/10'
                      }`}
                    >
                      <TokenImage src={token.logoURI} className="w-4 h-4 rounded-full" />
                      <span className="text-[10px] text-amber-400 font-bold">{token.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                <span className="text-sm text-amber-800/50">Loading tokens...</span>
              </div>
            ) : activeTab === 'prediction' ? (
              // --- Prediction View ---
              <div className="px-2 pt-4">
                {groupedPredictions.map(group => (
                  <PredictionEventCard 
                    key={`pred-${group.marketId}`} 
                    group={group} 
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
              // --- Stock View (Grid) ---
              <div className="px-2 pt-4">
                {sortedVisibleTokens.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-40 gap-3 text-amber-800/30">
                     <Search size={32} strokeWidth={1.5} />
                     <span className="text-sm">No stocks found</span>
                   </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
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
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-amber-800/30">
                <Search size={32} strokeWidth={1.5} />
                <span className="text-sm">No tokens found</span>
              </div>
            ) : (
              // --- Default List View ---
              <>
                <div className="flex items-center gap-2.5 px-3 py-1.5 text-[9px] text-white/20 uppercase tracking-wider">
                  <div className="w-5" />
                  <div className="w-9" />
                  <div className="flex-1">Token</div>
                  <div className="w-[50px] text-right">MC</div>
                  <div className="w-[50px] text-right">VOL</div>
                  <div className="w-7" />
                </div>
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const token = sortedVisibleTokens[virtualRow.index];
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
                        <DesktopTokenListItem
                          token={token}
                          isSelected={isSelected}
                          onSelect={() => handleTokenSelect(token)}
                          isFavorite={preferences.isFavorite(token.address)}
                          onToggleFavorite={() => preferences.toggleFavorite(token.address)}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};