import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, type PanInfo, type Variants } from 'framer-motion';
import { 
  Search, Plus, ArrowLeft, Rocket, X, ChevronRight, 
  Sparkles, RefreshCw, Type, FileText, Fingerprint, Layers,
  Check, TrendingUp, Loader2, AlertCircle, Percent
} from 'lucide-react';
import { JupiterService, type JupiterToken } from '../../../services/jupiter';
import { TokenImage } from '../../common/TokenImage';
import { WeightControl } from './WeightControl';
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

// --- Animation Variants ---
const drawerVariants: Variants = {
  hidden: { y: "100%" },
  visible: { y: "50%", transition: { type: "spring", damping: 25, stiffness: 200, mass: 0.8, delay: 0.2 } },
  full: { y: "8%", transition: { type: "spring", damping: 25, stiffness: 200 } },
  closed: { y: "calc(100% - 80px)", transition: { type: "spring", damping: 25, stiffness: 200 } }
};

const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
};

// --- Helper Components ---
const AnimatedField = ({ isActive, onClick, children, label, icon: Icon }: any) => (
    <motion.div
        layout
        onClick={onClick}
        animate={{
            borderColor: isActive ? "rgba(249, 115, 22, 0.5)" : "rgba(255, 255, 255, 0.05)",
            backgroundColor: isActive ? "rgba(20, 20, 20, 1)" : "rgba(12, 12, 12, 1)",
            scale: isActive ? 1.02 : 1
        }}
        className="relative rounded-3xl border border-white/5 p-5 cursor-text transition-colors"
    >
        <div className={`flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider ${isActive ? 'text-orange-500' : 'text-white/30'}`}>
            <Icon size={14} /> {label}
        </div>
        {children}
    </motion.div>
);

const TokenListItem = ({ token, isSelected, onSelect }: { 
  token: JupiterToken; 
  isSelected: boolean; 
  onSelect: (e: React.MouseEvent) => void;
}) => (
  <motion.button
    variants={listItemVariants}
    whileTap={{ scale: 0.98 }}
    disabled={isSelected}
    onClick={onSelect}
    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
      isSelected ? 'bg-white/5 opacity-40 cursor-not-allowed' : 'bg-transparent hover:bg-white/5 active:bg-white/10'
    }`}
  >
    <div className="relative flex-none">
      <TokenImage src={token.logoURI} className="w-10 h-10 rounded-full bg-white/10" />
      {token.isVerified && (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
          <Check size={10} className="text-white" />
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0 text-left">
      <div className="flex items-center gap-2">
        <span className="font-bold text-white text-sm">{token.symbol}</span>
        {token.tags?.includes('birdeye-trending') && <TrendingUp size={12} className="text-green-400" />}
        {token.tags?.includes('stable') && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">Stable</span>
        )}
      </div>
      <div className="text-xs text-white/40 truncate">{token.name}</div>
    </div>
    {!isSelected ? (
      <div className="flex-none w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30">
        <Plus size={16} />
      </div>
    ) : (
      <div className="flex-none w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
        <Check size={14} className="text-orange-500" />
      </div>
    )}
  </motion.button>
);

// --- Portfolio Asset Card ---
const AssetCard = ({ 
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
    initial={{ opacity: 0, scale: 0.9, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.8, x: -100 }}
    className="bg-[#111] rounded-2xl p-4 border border-white/5"
  >
    {/* Header: Token Info + Remove */}
    <div className="flex items-center gap-3 mb-4">
      <TokenImage src={item.token.logoURI} className="w-11 h-11 rounded-full flex-none" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white text-base">{item.token.symbol}</div>
        <div className="text-xs text-white/40 truncate">{item.token.name}</div>
      </div>
      <button 
        onClick={() => onRemove(item.token.address)} 
        className="w-9 h-9 flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
      >
        <X size={18} />
      </button>
    </div>

    {/* Weight Control */}
    <WeightControl
      value={item.weight}
      onChange={(val) => onUpdateWeight(item.token.address, val)}
      totalWeight={totalWeight}
    />
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

  const triggerAddAnimation = useCallback((e: React.MouseEvent, token: JupiterToken) => {
    triggerHaptic();
    if (portfolio.some(p => p.token.address === token.address)) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFlyingToken({ token, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }, [portfolio]);
  
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

  const visibleTokens = useMemo(() => displayTokens.slice(0, 150), [displayTokens]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col h-[100dvh] bg-black text-white overflow-hidden font-sans">
      
      {/* Header */}
      <motion.div 
         initial={{ opacity: 0, y: -20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.3 }}
         className="flex-none px-4 py-3 flex items-center justify-between z-30 bg-black border-b border-white/5"
      >
         <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                 <ArrowLeft size={16} />
            </button>
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/50">
               <Layers size={16} />
            </div>
            <span className="font-bold text-sm tracking-wide">Axis Builder</span>
         </div>
         <div className="text-xs font-mono text-white/30">v0.4</div>
      </motion.div>

      {/* Main Builder Area */}
      <motion.div 
         animate={{ opacity: step === 'builder' ? 1 : 0, scale: step === 'builder' ? 1 : 0.95 }}
         className={`flex-1 flex flex-col ${step === 'builder' ? '' : 'pointer-events-none absolute inset-0'}`}
      >
          <div className="flex-1 bg-[#050505] flex flex-col relative z-0 pb-32">
            {/* Stats Header */}
            <div className="px-4 py-3 flex justify-between items-center border-b border-white/5 bg-[#050505] z-10 sticky top-0">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-lg ${
                    totalWeight === 100 ? 'bg-emerald-500/20 text-emerald-400' : 
                    totalWeight > 100 ? 'bg-red-500/20 text-red-400' : 
                    'bg-white/10 text-white'
                  }`}>
                    {totalWeight}
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Total</div>
                    <div className="text-sm">
                      {totalWeight === 100 ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check size={14} /> Perfect
                        </span>
                      ) : totalWeight > 100 ? (
                        <span className="text-red-400">{totalWeight - 100}% over</span>
                      ) : (
                        <span className="text-white/50">{100 - totalWeight}% left</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {portfolio.length >= 2 && (
                    <button
                      onClick={distributeEvenly}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <Percent size={12} />
                      Equal
                    </button>
                  )}
                  <div className="text-xs text-white/30 bg-white/5 px-2.5 py-1.5 rounded-lg">
                    {portfolio.length} asset{portfolio.length !== 1 ? 's' : ''}
                  </div>
                </div>
            </div>

            {/* Portfolio List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {/* Warning */}
                <AnimatePresence>
                  {totalWeight > 100 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                    >
                      <AlertCircle size={18} />
                      <span>Total exceeds 100%. Reduce some weights to continue.</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="popLayout">
                  {portfolio.map(item => (
                    <AssetCard
                      key={item.token.address}
                      item={item}
                      totalWeight={totalWeight}
                      onUpdateWeight={updateWeight}
                      onRemove={removeToken}
                    />
                  ))}
                </AnimatePresence>
                
                {/* Empty State */}
                {portfolio.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    transition={{ delay: 0.5 }}
                    className="h-48 flex flex-col items-center justify-center text-white/20 gap-3"
                  >
                    <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center">
                        <Plus size={28} />
                    </div>
                    <span className="text-sm">Select tokens from below</span>
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
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.05}
        onDragEnd={(_, info: PanInfo) => {
            const { offset, velocity } = info;
            if (drawerState === 'half' && (offset.y > 100 || velocity.y > 500)) setDrawerState('closed');
            else if (drawerState === 'half' && (offset.y < -100 || velocity.y < -500)) setDrawerState('full');
            else if (drawerState === 'closed' && (offset.y < -50 || velocity.y < -500)) setDrawerState('half');
            else if (drawerState === 'full' && (offset.y > 100 || velocity.y > 500)) setDrawerState('half');
        }}
        className="absolute top-0 bottom-0 left-0 right-0 bg-[#0a0a0a] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 flex flex-col border-t border-white/10"
      >
        <div 
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing" 
          onClick={() => setDrawerState(prev => prev === 'closed' ? 'half' : prev === 'half' ? 'full' : 'closed')}
        >
           <div className={`w-10 h-1 rounded-full transition-colors ${drawerState === 'closed' ? 'bg-orange-500' : 'bg-white/20'}`} />
        </div>
        
        {/* Search */}
        <div className="px-4 pb-3">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setDrawerState('full')}
                    placeholder="Search tokens..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-10 py-3 text-sm focus:border-orange-500/50 outline-none transition-all placeholder:text-white/30 text-white"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10">
                    <X size={16} className="text-white/40" />
                  </button>
                )}
                {isSearching && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 text-orange-500 animate-spin" size={16} />}
            </div>
            <div className="flex justify-between items-center mt-2 px-1">
              <span className="text-[11px] text-white/30">
                {searchQuery ? `${displayTokens.length} results` : `${allTokens.length.toLocaleString()} tokens`}
              </span>
            </div>
        </div>

        {/* Token List */}
        <div className="flex-1 overflow-y-auto px-2 pb-8 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              <span className="text-sm text-white/40">Loading tokens...</span>
            </div>
          ) : visibleTokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-white/30">
              <Search size={32} strokeWidth={1.5} />
              <span className="text-sm">No tokens found</span>
            </div>
          ) : (
            <motion.div initial="hidden" animate="visible" className="space-y-0.5">
              {visibleTokens.map(token => (
                <TokenListItem
                  key={token.address}
                  token={token}
                  isSelected={selectedIds.has(token.address)}
                  onSelect={(e) => triggerAddAnimation(e, token)}
                />
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Flying Particle */}
      <AnimatePresence>
        {flyingToken && (
           <motion.div
             initial={{ position: 'fixed', left: flyingToken.x, top: flyingToken.y, x: "-50%", y: "-50%", scale: 1, opacity: 1 }}
             animate={{ left: "50%", top: "18%", scale: 0.3, opacity: 0 }}
             transition={{ duration: 0.4, ease: "backIn" }}
             onAnimationComplete={handleAnimationComplete}
             className="z-50 pointer-events-none"
           >
             <div className="w-14 h-14 rounded-full bg-[#222] border-2 border-orange-500 flex items-center justify-center overflow-hidden">
               <TokenImage src={flyingToken.token.logoURI} className="w-full h-full object-cover" />
             </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <div className="absolute bottom-6 left-6 right-6 z-50 pointer-events-none">
          <AnimatePresence>
            {step === 'builder' && isValidAllocation && (
                <motion.button
                    initial={{ y: 50, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }} 
                    exit={{ y: 50, opacity: 0 }}
                    onClick={handleToIdentity}
                    className="w-full py-4 bg-white text-black font-bold text-lg rounded-2xl shadow-xl flex items-center justify-center gap-2 pointer-events-auto hover:bg-gray-200 transition-colors"
                >
                    Next: Strategy Identity <ChevronRight size={20} />
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
                 className="fixed inset-0 z-40 bg-black flex flex-col pt-[60px]"
              >
                 <div className="absolute top-0 left-0 right-0 h-[60px] flex items-center px-4">
                     <button onClick={() => setStep('builder')} className="p-2 bg-white/5 rounded-full"><ArrowLeft size={18} /></button>
                 </div>

                 <div className="flex-1 overflow-y-auto px-5 py-6 custom-scrollbar pb-32">
                     <div className="max-w-md mx-auto space-y-6">
                        <div className="text-center mb-8">
                            <motion.div 
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               transition={{ delay: 0.1 }}
                               className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-bold uppercase tracking-wider mb-2"
                            >
                                <Fingerprint size={12} /> Identity Studio
                            </motion.div>
                            <motion.h2 className="text-3xl font-bold text-white">Name Your Strategy</motion.h2>
                        </div>

                        <AnimatedField isActive={focusedField === 'ticker'} onClick={() => setFocusedField('ticker')} label="Ticker Symbol" icon={Sparkles}>
                             <div className="flex items-center gap-4">
                                <div className={`text-4xl font-black ${focusedField === 'ticker' ? 'text-orange-500' : 'text-white/20'}`}>$</div>
                                <input 
                                    type="text" maxLength={5} value={config.ticker}
                                    onFocus={() => { setFocusedField('ticker'); triggerHaptic(); }}
                                    onChange={(e) => setConfig({ ...config, ticker: e.target.value.toUpperCase() })}
                                    placeholder="MEME"
                                    className="flex-1 bg-transparent text-4xl font-black tracking-widest placeholder:text-white/10 focus:outline-none uppercase text-white caret-orange-500"
                                />
                                <button onClick={(e) => { e.stopPropagation(); generateRandomTicker(); }} className="p-3 bg-white/5 rounded-xl text-white/30 hover:text-white"><RefreshCw size={20} /></button>
                             </div>
                        </AnimatedField>

                        <AnimatedField isActive={focusedField === 'name'} onClick={() => setFocusedField('name')} label="Strategy Name" icon={Type}>
                            <input 
                                type="text" maxLength={30} value={config.name}
                                onFocus={() => { setFocusedField('name'); triggerHaptic(); }}
                                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                                placeholder="My Alpha Fund"
                                className="w-full bg-transparent text-xl font-bold placeholder:text-white/10 focus:outline-none text-white py-2"
                            />
                        </AnimatedField>

                        <AnimatedField isActive={focusedField === 'desc'} onClick={() => setFocusedField('desc')} label="Thesis / Description" icon={FileText}>
                             <textarea 
                                rows={4} value={config.description}
                                onFocus={() => { setFocusedField('desc'); triggerHaptic(); }}
                                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                                placeholder="Investment thesis..."
                                className="w-full bg-transparent text-base text-white/90 placeholder:text-white/10 focus:outline-none resize-none leading-relaxed"
                            />
                        </AnimatedField>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                             <div className="bg-[#121212] p-4 rounded-2xl border border-white/5">
                                 <div className="text-[10px] text-white/30 uppercase font-bold">Curator Fee</div>
                                 <div className="text-lg font-mono font-bold text-orange-500">0.5%</div>
                             </div>
                             <div className="bg-[#121212] p-4 rounded-2xl border border-white/5">
                                 <div className="text-[10px] text-white/30 uppercase font-bold">Assets</div>
                                 <div className="text-lg font-mono font-bold text-white">{portfolio.length}</div>
                             </div>
                        </div>
                     </div>
                 </div>

                 <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-50">
                    <button 
                        onClick={handleDeploy}
                        disabled={!config.ticker || !config.name}
                        className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-2xl transition-all ${(!config.ticker || !config.name) ? 'bg-[#222] text-white/20 cursor-not-allowed' : 'bg-white text-black hover:scale-[1.02] active:scale-95'}`}
                    >
                        {connected ? <>Deploy Strategy <Rocket size={24} /></> : "Connect Wallet"}
                    </button>
                 </div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};