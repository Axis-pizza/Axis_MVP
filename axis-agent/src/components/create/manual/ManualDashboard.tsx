import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, type PanInfo, type Variants, useDragControls } from 'framer-motion';
import { 
  Search, Plus, ArrowLeft, Rocket, X, ChevronRight, 
  Sparkles, RefreshCw, Type, FileText, Fingerprint, Layers,
  Check, TrendingUp, Loader2, AlertCircle, Percent, Minus
} from 'lucide-react';
import { JupiterService, type JupiterToken } from '../../../services/jupiter';
import { TokenImage } from '../../common/TokenImage';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { toast } from 'sonner';

// --- Types ---
export interface ManualData {
  tokens: { symbol: string; weight: number; mint: string; logoURI?: string }[];
  config: StrategyConfig;
}

interface StrategyConfig {
  name: string;
  ticker: string;
  description: string;
}

interface AssetItem {
  token: JupiterToken;
  weight: number;
  locked: boolean;
  id: string;
}

interface ManualDashboardProps {
  onDeploySuccess: (data: ManualData) => void;
  onBack?: () => void;
  initialConfig?: Partial<StrategyConfig>;
  initialTokens?: { symbol: string; weight: number }[];
}

const POPULAR_SYMBOLS = ['SOL', 'USDC', 'USDT', 'JUP', 'JLP', 'BONK', 'WIF', 'TRUMP', 'ETH', 'JitoSOL'];
const STEP_AMOUNT = 5;

// --- Animation Variants ---
const drawerVariants: Variants = {
  hidden: { y: "100%" },
  visible: { y: "45%", transition: { type: "spring", damping: 25, stiffness: 200, mass: 0.8, delay: 0.2 } },
  full: { y: "5%", transition: { type: "spring", damping: 25, stiffness: 200 } },
  closed: { y: "calc(100% - 100px)", transition: { type: "spring", damping: 25, stiffness: 200 } }
};

// --- Mobile Weight Control ---
const MobileWeightControl = ({ 
  value, 
  onChange, 
  totalWeight 
}: { 
  value: number; 
  onChange: (v: number) => void; 
  totalWeight: number;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setInputValue(value.toString());
  }, [value, isEditing]);

  const handleChange = (newValue: number) => {
    onChange(Math.max(0, Math.min(100, newValue)));
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const parsed = parseInt(inputValue);
    if (!isNaN(parsed)) handleChange(parsed);
    else setInputValue(value.toString());
  };

  const isOverLimit = totalWeight > 100;

  return (
    <div className="space-y-3">
      {/* スライダー + 数値 */}
      <div className="flex items-center gap-4">
        {/* スライダー */}
        <div className="flex-1 relative h-12 flex items-center">
          <div className="absolute inset-x-0 h-3 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${isOverLimit ? 'bg-red-500' : 'bg-gradient-to-r from-amber-700 to-amber-500'}`}
              animate={{ width: `${Math.min(100, value)}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={value}
            onChange={(e) => handleChange(parseInt(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            animate={{ left: `calc(${Math.min(100, value)}% - 14px)` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className={`w-7 h-7 rounded-full border-2 shadow-lg ${
              isOverLimit ? 'bg-red-500 border-red-400' : 'bg-amber-500 border-amber-400'
            }`} />
          </motion.div>
        </div>

        {/* 数値表示/入力 */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={handleInputBlur}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.blur()}
            className={`w-20 h-12 bg-black/50 border-2 rounded-xl text-center text-xl font-bold outline-none ${
              isOverLimit ? 'border-red-500 text-red-400' : 'border-amber-600 text-white'
            }`}
            style={{ fontFamily: '"Times New Roman", serif' }}
            maxLength={3}
            autoFocus
          />
        ) : (
          <button
            onClick={() => { setIsEditing(true); setInputValue(value.toString()); }}
            className={`w-20 h-12 rounded-xl font-bold text-xl transition-all active:scale-95 ${
              isOverLimit ? 'bg-red-500/20 text-red-400' : 'bg-amber-900/30 text-amber-400'
            }`}
            style={{ fontFamily: '"Times New Roman", serif' }}
          >
            {value}%
          </button>
        )}
      </div>

      {/* クイックボタン + ステッパー */}
      <div className="flex items-center gap-2">
        {/* クイックボタン */}
        {[10, 25, 50].map((qv) => (
          <button
            key={qv}
            onClick={() => handleChange(qv)}
            className={`flex-1 h-11 rounded-xl text-sm font-bold transition-all active:scale-95 ${
              value === qv
                ? 'bg-amber-600 text-black'
                : 'bg-white/5 text-white/50 active:bg-white/10'
            }`}
          >
            {qv}%
          </button>
        ))}

        {/* スペーサー */}
        <div className="w-2" />

        {/* ステッパー */}
        <button
          onClick={() => handleChange(value - STEP_AMOUNT)}
          disabled={value <= 0}
          className="w-12 h-11 rounded-xl bg-white/5 flex items-center justify-center text-white/50 active:bg-red-500/20 active:text-red-400 disabled:opacity-30 transition-all active:scale-95"
        >
          <Minus size={20} />
        </button>
        <button
          onClick={() => handleChange(value + STEP_AMOUNT)}
          disabled={value >= 100}
          className="w-12 h-11 rounded-xl bg-white/5 flex items-center justify-center text-white/50 active:bg-green-500/20 active:text-green-400 disabled:opacity-30 transition-all active:scale-95"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
};

// --- Mobile Token List Item ---
const MobileTokenListItem = ({ 
  token, 
  isSelected, 
  hasSelection,
  onSelect 
}: { 
  token: JupiterToken; 
  isSelected: boolean; 
  hasSelection: boolean;
  onSelect: () => void;
}) => {
  return (
    <motion.button
      disabled={isSelected}
      onClick={onSelect}
      initial={{ x: 0, opacity: 1 }}
      animate={{ 
        x: 0,
        opacity: isSelected ? 1 : hasSelection ? 0.5 : 1,
      }}
      whileHover={{ x: 6, opacity: 1 }}
      whileTap={{ scale: 0.98, x: 6 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-colors min-h-[72px] ${
        isSelected 
          ? 'bg-gradient-to-r from-amber-950/60 to-amber-900/40 border border-amber-800/40' 
          : 'bg-transparent active:bg-white/5'
      }`}
    >
      <div className="relative flex-none">
        <TokenImage 
          src={token.logoURI} 
          className="w-12 h-12 rounded-full bg-white/10"
        />
        {token.isVerified && (
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
            isSelected ? 'bg-gradient-to-br from-amber-600 to-amber-800' : 'bg-blue-500'
          }`}>
            <Check size={12} className="text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className={`font-semibold text-base ${isSelected ? 'text-amber-500' : 'text-white'}`}>
            {token.symbol}
          </span>
          {token.tags?.includes('birdeye-trending') && <TrendingUp size={14} className="text-green-400" />}
          {token.tags?.includes('stable') && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Stable</span>
          )}
        </div>
        <div className={`text-sm truncate mt-0.5 ${isSelected ? 'text-amber-600/60' : 'text-white/40'}`}>
          {token.name}
        </div>
      </div>

      {isSelected ? (
        <div className="flex-none w-11 h-11 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg">
          <Check size={20} className="text-white" />
        </div>
      ) : (
        <div className="flex-none w-11 h-11 rounded-full bg-white/5 flex items-center justify-center text-white/30">
          <Plus size={20} />
        </div>
      )}
    </motion.button>
  );
};

// --- Mobile Asset Card ---
const MobileAssetCard = ({ 
  item, 
  totalWeight, 
  onUpdateWeight, 
  onRemove 
}: {
  item: AssetItem;
  totalWeight: number;
  onUpdateWeight: (address: string, value: number) => void;
  onRemove: (address: string) => void;
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.95, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9, x: -50 }}
    className="relative overflow-hidden rounded-3xl border border-amber-900/20"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-amber-950/20" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(180,83,9,0.1),transparent_50%)]" />
    
    <div className="relative p-5">
      <div className="flex items-center gap-4 mb-5">
        <TokenImage src={item.token.logoURI} className="w-14 h-14 rounded-full flex-none ring-2 ring-amber-900/30" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-lg">{item.token.symbol}</div>
          <div className="text-sm text-white/40 truncate">{item.token.name}</div>
        </div>
        <button 
          onClick={() => onRemove(item.token.address)} 
          className="w-12 h-12 flex items-center justify-center text-white/30 active:text-red-400 active:bg-red-500/10 rounded-2xl transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <MobileWeightControl
        value={item.weight}
        onChange={(val) => onUpdateWeight(item.token.address, val)}
        totalWeight={totalWeight}
      />
    </div>
  </motion.div>
);

// --- Main Dashboard ---
export const ManualDashboard = ({ 
  onDeploySuccess, 
  onBack, 
  initialConfig, 
  initialTokens 
}: ManualDashboardProps) => {

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  };

  const dragControls = useDragControls(); // ★ Drag Controls

  const [step, setStep] = useState<'builder' | 'identity'>('builder');
  const [allTokens, setAllTokens] = useState<JupiterToken[]>([]); 
  const [displayTokens, setDisplayTokens] = useState<JupiterToken[]>([]); 
  const [portfolio, setPortfolio] = useState<AssetItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  const [config, setConfig] = useState<StrategyConfig>({
     name: initialConfig?.name || '', 
     ticker: initialConfig?.ticker || '', 
     description: initialConfig?.description || '',
  });

  const [focusedField, setFocusedField] = useState<'ticker' | 'name' | 'desc' | null>('ticker');
  const [drawerState, setDrawerState] = useState<'closed' | 'half' | 'full'>('half'); 
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [flyingToken, setFlyingToken] = useState<{ token: JupiterToken, x: number, y: number } | null>(null);

  // --- Computed Values ---
  const totalWeight = useMemo(() => portfolio.reduce((sum, i) => sum + i.weight, 0), [portfolio]);
  const selectedIds = useMemo(() => new Set(portfolio.map(p => p.token.address)), [portfolio]);
  const hasSelection = portfolio.length > 0;
  const isValidAllocation = totalWeight === 100 && portfolio.length >= 2;

  // --- Init ---
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const list = await JupiterService.getLiteList();
        const popular = POPULAR_SYMBOLS
          .map(sym => list.find(t => t.symbol === sym))
          .filter((t): t is JupiterToken => t !== undefined);
        const others = list.filter(t => !POPULAR_SYMBOLS.includes(t.symbol));
        setAllTokens([...popular, ...others]);
        setDisplayTokens([...popular, ...others]);
        
        if (initialTokens) {
          const initialAssets: AssetItem[] = [];
          initialTokens.forEach(p => {
            const t = list.find(x => x.symbol === p.symbol);
            if (t) initialAssets.push({ token: t, weight: p.weight, locked: true, id: t.address });
          });
          setPortfolio(initialAssets);
        }
      } catch (e) {
        console.error('[ManualDashboard] Failed to load tokens:', e);
        toast.error('Failed to load tokens');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [initialTokens]);

  // --- Search ---
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDisplayTokens(allTokens);
      setIsSearching(false);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      const query = searchQuery.toLowerCase();
      const localResults = allTokens.filter(t => 
        t.symbol.toLowerCase().includes(query) || 
        t.name.toLowerCase().includes(query) ||
        t.address.toLowerCase() === query
      );
      
      if (searchQuery.length > 20 || localResults.length < 5) {
        try {
          const apiResults = await JupiterService.searchTokens(searchQuery);
          if (apiResults.length > 0) {
            const merged = [...localResults];
            apiResults.forEach(t => {
              if (!merged.find(m => m.address === t.address)) merged.push(t);
            });
            setDisplayTokens(merged);
          } else {
            setDisplayTokens(localResults);
          }
        } catch {
          setDisplayTokens(localResults);
        }
      } else {
        setDisplayTokens(localResults);
      }
      setIsSearching(false);
    }, 200);

    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery, allTokens]);

  // --- Handlers ---
  const handleToIdentity = () => {
    triggerHaptic();
    setDrawerState('closed');
    setStep('identity');
    setFocusedField('ticker');
  };

  const handleDeploy = () => {
    triggerHaptic();
    if (!config.name || !config.ticker) {
      toast.error("Required Fields", { description: "Please enter a Name and Ticker." });
      return;
    }
    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }
    onDeploySuccess({
      tokens: portfolio.map(p => ({
        symbol: p.token.symbol,
        weight: p.weight,
        mint: p.token.address,
        logoURI: p.token.logoURI
      })),
      config
    });
  };

  const generateRandomTicker = () => {
    triggerHaptic();
    const prefixes = ['MOON', 'CHAD', 'PEPE', 'SOL', 'DEGEN', 'ALPHA'];
    const suffix = Math.floor(Math.random() * 100);
    setConfig(prev => ({ ...prev, ticker: `${prefixes[Math.floor(Math.random() * prefixes.length)]}${suffix}` }));
  };

  const triggerAddAnimation = useCallback((token: JupiterToken, rect: DOMRect) => {
    triggerHaptic();
    if (portfolio.some(p => p.token.address === token.address)) return;
    setFlyingToken({ token, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }, [portfolio]);

  const handleTokenSelect = useCallback((token: JupiterToken, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    triggerAddAnimation(token, rect);
  }, [triggerAddAnimation]);
  
  const handleAnimationComplete = () => {
    if (!flyingToken) return;
    setPortfolio(prev => {
      const currentW = prev.reduce((s, i) => s + i.weight, 0);
      const nextW = Math.max(0, Math.min(100 - currentW, 50));
      return [...prev, { token: flyingToken.token, weight: nextW, locked: false, id: flyingToken.token.address }];
    });
    triggerHaptic();
    setFlyingToken(null);
    setSearchQuery(''); 
  };
  
  const removeToken = (address: string) => {
    triggerHaptic();
    setPortfolio(prev => prev.filter(p => p.token.address !== address));
  };
  
  const updateWeight = (address: string, val: number) => {
    setPortfolio(prev => prev.map(p => 
      p.token.address === address ? { ...p, weight: val } : p
    ));
  };

  const distributeEvenly = () => {
    triggerHaptic();
    if (portfolio.length === 0) return;
    const evenWeight = Math.floor(100 / portfolio.length);
    const remainder = 100 - (evenWeight * portfolio.length);
    setPortfolio(prev => prev.map((p, i) => ({
      ...p,
      weight: evenWeight + (i === 0 ? remainder : 0)
    })));
  };

  const visibleTokens = useMemo(() => displayTokens.slice(0, 100), [displayTokens]);

  const sortedVisibleTokens = useMemo(() => {
    if (!hasSelection) return visibleTokens;
    const selected = visibleTokens.filter(t => selectedIds.has(t.address));
    const unselected = visibleTokens.filter(t => !selectedIds.has(t.address));
    return [...selected, ...unselected];
  }, [visibleTokens, selectedIds, hasSelection]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col h-[100dvh] bg-black text-white overflow-hidden font-sans">
      
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
      <motion.div 
         animate={{ opacity: step === 'builder' ? 1 : 0, scale: step === 'builder' ? 1 : 0.95 }}
         // ★修正1: min-h-0 を追加 (これでflexコンテナからはみ出さなくなります)
         className={`flex-1 flex flex-col min-h-0 ${step === 'builder' ? '' : 'pointer-events-none absolute inset-0'}`}
      >
          {/* ★修正2: ここにも min-h-0 を追加し、h-full を削除 (flex-1だけで十分なため) */}
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
            {/* ★修正3: overscroll-contain を追加してスクロール体験を向上 */}
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
      </motion.div>

      {/* Token Selector Drawer */}
      <motion.div 
        variants={drawerVariants}
        initial="hidden"
        animate={step === 'builder' ? (drawerState === 'closed' ? "closed" : drawerState === 'half' ? "visible" : "full") : "closed"}
        drag={step === 'builder' ? "y" : false}
        dragListener={false} // ★ ポイント: 自動ドラッグ無効化
        dragControls={dragControls} // ★ ポイント: 手動制御
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.05}
        onDragEnd={(_, info: PanInfo) => {
            const { offset, velocity } = info;
            if (drawerState === 'half' && (offset.y > 100 || velocity.y > 500)) setDrawerState('closed');
            else if (drawerState === 'half' && (offset.y < -100 || velocity.y < -500)) setDrawerState('full');
            else if (drawerState === 'closed' && (offset.y < -50 || velocity.y < -500)) setDrawerState('half');
            else if (drawerState === 'full' && (offset.y > 100 || velocity.y > 500)) setDrawerState('half');
        }}
        className="absolute top-0 bottom-0 left-0 right-0 bg-[#0a0a0a] rounded-t-[32px] shadow-[0_-10px_60px_rgba(180,83,9,0.15)] z-20 flex flex-col border-t border-amber-900/30"
      >
        {/* ドラッグハンドル - ここだけがドラッグ可能 */}
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
        <div className="px-4 pb-4 shrink-0">
            <div className="relative">
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
            
            <div className="flex justify-between items-center mt-3 px-2">
              <span className="text-sm text-amber-800/40">
                {searchQuery ? `${displayTokens.length} results` : `${allTokens.length.toLocaleString()} tokens`}
              </span>
              
              {hasSelection && (
                <motion.span 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-sm text-amber-600 flex items-center gap-1"
                >
                  <Check size={14} />
                  {portfolio.length} selected
                </motion.span>
              )}
            </div>
        </div>

        {/* Token List - ドラッグ影響を受けずにスクロール可能 */}
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
              {hasSelection && !searchQuery && (
                <div className="px-3 pt-2 pb-2 sticky top-0 bg-[#0a0a0a] z-10">
                  <span className="text-xs font-medium uppercase tracking-wider text-amber-700/50">
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
                      <div className="px-3 pt-5 pb-2 flex items-center gap-3 sticky top-0 bg-[#0a0a0a] z-10">
                        <span className="text-xs font-medium uppercase tracking-wider text-white/20">
                          Available
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-r from-amber-900/20 to-transparent" />
                      </div>
                    )}
                    <MobileTokenListItem
                      token={token}
                      isSelected={isSelected}
                      hasSelection={hasSelection}
                      onSelect={() => {
                        const el = document.querySelector(`[data-token="${token.address}"]`);
                        if (el) {
                          const rect = el.getBoundingClientRect();
                          triggerAddAnimation(token, rect);
                        } else {
                          // Fallback
                          setPortfolio(prev => {
                            const currentW = prev.reduce((s, i) => s + i.weight, 0);
                            const nextW = Math.max(0, Math.min(100 - currentW, 50));
                            return [...prev, { token, weight: nextW, locked: false, id: token.address }];
                          });
                          triggerHaptic();
                        }
                      }}
                    />
                  </div>
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
            {step === 'builder' && isValidAllocation && (
                <motion.button
                    initial={{ y: 50, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }} 
                    exit={{ y: 50, opacity: 0 }}
                    onClick={handleToIdentity}
                    className="w-full py-5 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-black font-bold text-lg rounded-2xl shadow-xl shadow-amber-900/40 flex items-center justify-center gap-3 pointer-events-auto active:scale-[0.98] transition-transform"
                >
                    Next <ChevronRight size={22} />
                </motion.button>
            )}
          </AnimatePresence>
      </div>

      {/* Identity Step */}
      <AnimatePresence>
          {step === 'identity' && (
              <motion.div 
                 initial={{ y: "100%" }}
                 animate={{ y: 0 }}
                 exit={{ y: "100%" }}
                 transition={{ type: "spring", stiffness: 300, damping: 30 }}
                 className="fixed inset-0 z-40 bg-black flex flex-col"
              >
                 {/* Header */}
                 <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 safe-area-top">
                     <button 
                       onClick={() => setStep('builder')} 
                       className="w-11 h-11 bg-white/5 rounded-full flex items-center justify-center active:bg-white/10"
                     >
                       <ArrowLeft size={20} />
                     </button>
                     <span className="font-semibold text-base">Strategy Identity</span>
                 </div>

                 <div className="flex-1 overflow-y-auto px-5 py-6 custom-scrollbar">
                     <div className="max-w-md mx-auto space-y-6">
                        <div className="text-center mb-6">
                            <motion.div 
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-900/20 border border-amber-800/20 text-amber-600 text-sm font-medium uppercase tracking-wider mb-3"
                            >
                                <Fingerprint size={14} /> Identity
                            </motion.div>
                            <h2 
                              className="text-2xl text-white"
                              style={{ fontFamily: '"Times New Roman", serif' }}
                            >
                              Name Your Strategy
                            </h2>
                        </div>

                        {/* Ticker */}
                        <div 
                          onClick={() => setFocusedField('ticker')}
                          className={`rounded-3xl border p-5 transition-all ${
                            focusedField === 'ticker' ? 'border-amber-700/50 bg-[#141414]' : 'border-white/5 bg-[#0c0c0c]'
                          }`}
                        >
                            <div className={`flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider ${focusedField === 'ticker' ? 'text-amber-600' : 'text-white/30'}`}>
                                <Sparkles size={14} /> Ticker
                            </div>
                            <div className="flex items-center gap-4">
                                <span 
                                  className={`text-4xl ${focusedField === 'ticker' ? 'text-amber-600' : 'text-white/20'}`}
                                  style={{ fontFamily: '"Times New Roman", serif' }}
                                >
                                  $
                                </span>
                                <input 
                                    type="text" 
                                    maxLength={5} 
                                    value={config.ticker}
                                    onFocus={() => setFocusedField('ticker')}
                                    onChange={(e) => setConfig({ ...config, ticker: e.target.value.toUpperCase() })}
                                    placeholder="MEME"
                                    className="flex-1 bg-transparent text-4xl tracking-widest placeholder:text-white/10 focus:outline-none uppercase text-white"
                                    style={{ fontFamily: '"Times New Roman", serif' }}
                                />
                                <button 
                                  onClick={(e) => { e.stopPropagation(); generateRandomTicker(); }} 
                                  className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-white/30 active:text-white active:bg-white/10"
                                >
                                  <RefreshCw size={22} />
                                </button>
                            </div>
                        </div>

                        {/* Name */}
                        <div 
                          onClick={() => setFocusedField('name')}
                          className={`rounded-3xl border p-5 transition-all ${
                            focusedField === 'name' ? 'border-amber-700/50 bg-[#141414]' : 'border-white/5 bg-[#0c0c0c]'
                          }`}
                        >
                            <div className={`flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider ${focusedField === 'name' ? 'text-amber-600' : 'text-white/30'}`}>
                                <Type size={14} /> Name
                            </div>
                            <input 
                                type="text" 
                                maxLength={30} 
                                value={config.name}
                                onFocus={() => setFocusedField('name')}
                                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                                placeholder="My Alpha Fund"
                                className="w-full bg-transparent text-xl placeholder:text-white/10 focus:outline-none text-white py-2"
                            />
                        </div>

                        {/* Description */}
                        <div 
                          onClick={() => setFocusedField('desc')}
                          className={`rounded-3xl border p-5 transition-all ${
                            focusedField === 'desc' ? 'border-amber-700/50 bg-[#141414]' : 'border-white/5 bg-[#0c0c0c]'
                          }`}
                        >
                            <div className={`flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider ${focusedField === 'desc' ? 'text-amber-600' : 'text-white/30'}`}>
                                <FileText size={14} /> Description
                            </div>
                            <textarea 
                                rows={4} 
                                value={config.description}
                                onFocus={() => setFocusedField('desc')}
                                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                                placeholder="Investment thesis..."
                                className="w-full bg-transparent text-base text-white/90 placeholder:text-white/10 focus:outline-none resize-none leading-relaxed"
                            />
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 pt-2">
                             <div className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-amber-950/20 p-5 rounded-2xl border border-amber-900/20">
                                 <div className="text-xs text-amber-700/50 uppercase font-medium">Fee</div>
                                 <div 
                                   className="text-2xl text-amber-500 mt-1"
                                   style={{ fontFamily: '"Times New Roman", serif' }}
                                 >
                                   0.5%
                                 </div>
                             </div>
                             <div className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-amber-950/20 p-5 rounded-2xl border border-amber-900/20">
                                 <div className="text-xs text-amber-700/50 uppercase font-medium">Assets</div>
                                 <div 
                                   className="text-2xl text-white mt-1"
                                   style={{ fontFamily: '"Times New Roman", serif' }}
                                 >
                                   {portfolio.length}
                                 </div>
                             </div>
                        </div>
                     </div>
                 </div>

                 {/* Deploy Button */}
                 <div className="p-5 pb-8 bg-gradient-to-t from-black via-black/90 to-transparent safe-area-bottom">
                    <button 
                        onClick={handleDeploy}
                        disabled={!config.ticker || !config.name}
                        className={`w-full py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-[0.98] ${
                          (!config.ticker || !config.name) 
                            ? 'bg-[#222] text-white/20 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-black'
                        }`}
                    >
                        {connected ? <>Deploy <Rocket size={24} /></> : "Connect Wallet"}
                    </button>
                 </div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};