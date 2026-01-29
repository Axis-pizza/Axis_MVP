import { useState, useRef, useEffect, useMemo } from 'react';
// ★修正: Variants に type を付与
import { motion, AnimatePresence, type PanInfo, type Variants } from 'framer-motion';
import { 
  Search, Plus, ArrowLeft, Rocket, X, ChevronUp, ChevronRight, 
  Sparkles, RefreshCw, Type, FileText, Fingerprint, Wallet, Layers
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

// --- Animation Variants ---
const drawerVariants: Variants = {
  hidden: { y: "100%" },
  visible: { 
    y: "55%", 
    transition: { 
      type: "spring", 
      damping: 25, 
      stiffness: 200,
      mass: 0.8,
      delay: 0.2 
    } 
  },
  full: { y: "15%", transition: { type: "spring", damping: 25, stiffness: 200 } },
  closed: { y: "calc(100% - 100px)", transition: { type: "spring", damping: 25, stiffness: 200 } }
};

const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.4
    }
  }
};

const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 20 }
  }
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
  
  // Data State
  const [allTokens, setAllTokens] = useState<JupiterToken[]>([]); 
  const [displayTokens, setDisplayTokens] = useState<JupiterToken[]>([]); 
  const [portfolio, setPortfolio] = useState<AssetItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  const [config, setConfig] = useState<StrategyConfig>({
     name: initialConfig?.name || '', 
     ticker: initialConfig?.ticker || '', 
     description: initialConfig?.description || '',
  });

  const [focusedField, setFocusedField] = useState<'ticker' | 'name' | 'desc' | null>('ticker');
  const [drawerState, setDrawerState] = useState<'closed' | 'half' | 'full'>('half'); 
  const deckRef = useRef<HTMLDivElement>(null);
  const [flyingToken, setFlyingToken] = useState<{ token: JupiterToken, x: number, y: number } | null>(null);

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
    const random = `${prefixes[Math.floor(Math.random() * prefixes.length)]}${suffix}`;
    setConfig(prev => ({ ...prev, ticker: random }));
  };

  // Init & Search
  useEffect(() => {
    const init = async () => {
        const list = await JupiterService.getLiteList();
        const majors = list.filter(t => ['SOL', 'USDC', 'JLP', 'WIF', 'BONK'].includes(t.symbol));
        const others = list.filter(t => !['SOL', 'USDC', 'JLP', 'WIF', 'BONK'].includes(t.symbol));
        const sorted = [...majors, ...others];
        
        setAllTokens(sorted);
        setDisplayTokens(sorted);

        if (initialTokens) {
             const initialAssets: AssetItem[] = [];
             initialTokens.forEach(p => {
                 const t = list.find(x => x.symbol === p.symbol);
                 if (t) initialAssets.push({ token: t, weight: p.weight, locked: true, id: t.address });
             });
             setPortfolio(initialAssets);
        }
    };
    init();
  }, [initialTokens]);

  useEffect(() => {
    if (!searchQuery) { setDisplayTokens(allTokens); return; }
    const lower = searchQuery.toLowerCase();
    setDisplayTokens(allTokens.filter(t => t.symbol.toLowerCase().includes(lower) || t.name.toLowerCase().includes(lower) || t.address === searchQuery));
  }, [searchQuery, allTokens]);

  const triggerAddAnimation = (e: React.MouseEvent, token: JupiterToken) => {
    triggerHaptic();
    if (portfolio.some(p => p.token.address === token.address)) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFlyingToken({ token, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };
  
  const handleAnimationComplete = () => {
    if (!flyingToken) return;
    setPortfolio(prev => {
        const currentW = prev.reduce((s, i) => s + i.weight, 0);
        const nextW = Math.max(0, 100 - currentW);
        return [...prev, { token: flyingToken.token, weight: nextW, locked: false, id: flyingToken.token.address }];
    });
    triggerHaptic();
    setFlyingToken(null);
    setSearchQuery(''); 
  };
  
  const removeToken = (address: string) => setPortfolio(prev => prev.filter(p => p.token.address !== address));
  const updateWeight = (address: string, val: number) => setPortfolio(prev => prev.map(p => p.token.address === address ? { ...p, weight: val } : p));
  const totalWeight = portfolio.reduce((sum, i) => sum + i.weight, 0);
  const selectedIds = useMemo(() => new Set(portfolio.map(p => p.token.address)), [portfolio]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col h-[100dvh] bg-black text-white overflow-hidden font-sans">
      
      {/* 1. Header (Fade In) */}
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
         <div className="text-xs font-mono text-white/30">v0.1</div>
      </motion.div>

      {/* 2. Main Builder Area */}
      <motion.div 
         animate={{ opacity: step === 'builder' ? 1 : 0, scale: step === 'builder' ? 1 : 0.95 }}
         className={`flex-1 flex flex-col ${step === 'builder' ? '' : 'pointer-events-none absolute inset-0'}`}
      >
          {/* Deck Area */}
          <div ref={deckRef} className="flex-1 bg-[#050505] flex flex-col relative z-0 pb-32">
            <div className="px-4 py-3 flex justify-between items-end border-b border-white/5 bg-[#050505] z-10 sticky top-0">
                <div>
                  <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">My Fund</div>
                  <div className="text-xl font-bold flex items-baseline gap-1">
                      <motion.span 
                        key={totalWeight}
                        initial={{ scale: 1.5, color: "#fff" }}
                        animate={{ scale: 1, color: totalWeight === 100 ? "#34d399" : "#fff" }}
                        className={totalWeight === 100 ? "text-emerald-400" : "text-white"}
                      >
                        {totalWeight}
                      </motion.span>
                      <span className="text-sm text-white/30">/ 100%</span>
                  </div>
                </div>
                <div className="text-xs text-white/30">{portfolio.length} Assets</div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                {portfolio.map(item => (
                    <motion.div
                      key={item.token.address}
                      layout
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, x: -50 }}
                      className="bg-[#121212] rounded-2xl p-3 flex items-center gap-3 border border-white/5 group relative overflow-hidden"
                    >
                      <TokenImage src={item.token.logoURI} className="w-8 h-8 rounded-full" />
                      <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-white">{item.token.symbol}</div>
                      </div>
                      <div className="flex items-center gap-3">
                          <input 
                            type="range" min="0" max="100" step="1"
                            value={item.weight}
                            onChange={(e) => updateWeight(item.token.address, parseInt(e.target.value))}
                            className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
                          />
                          <div className="w-10 text-right font-mono font-bold text-sm text-white">
                            {item.weight}%
                          </div>
                      </div>
                      <button onClick={() => removeToken(item.token.address)} className="w-8 h-8 flex items-center justify-center text-white/20 hover:text-red-400 bg-white/5 rounded-full">
                          <X size={16} />
                      </button>
                    </motion.div>
                ))}
                </AnimatePresence>
                
                {/* Empty State Hint */}
                {portfolio.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    transition={{ delay: 0.5 }}
                    className="h-40 flex flex-col items-center justify-center text-white/10 gap-2"
                  >
                    <div className="w-12 h-12 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center">
                        <Plus size={20} />
                    </div>
                    <span className="text-sm italic">Add assets from below</span>
                  </motion.div>
                )}
            </div>
          </div>
      </motion.div>

      {/* 3. Token Selector Drawer (Animated Entrance) */}
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
        className="absolute top-0 bottom-0 left-0 right-0 bg-[#0C0A09] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 flex flex-col border-t border-white/10"
      >
        <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing group" onClick={() => setDrawerState(prev => prev === 'closed' ? 'half' : 'closed')}>
           <div className={`w-12 h-1.5 rounded-full transition-colors ${drawerState === 'closed' ? 'bg-orange-500' : 'bg-white/10'}`} />
        </div>
        
        {/* Search Bar */}
        <div className="px-4 pb-4 pt-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setDrawerState('full')}
                    placeholder="Search tokens..."
                    className="w-full bg-[#1c1917] border border-white/5 rounded-2xl pl-10 pr-4 py-3 text-sm focus:border-white/20 outline-none transition-all placeholder:text-white/20 text-white"
                />
            </div>
        </div>

        {/* Token List (Staggered Animation) */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 custom-scrollbar">
            <motion.div 
              variants={listContainerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 gap-2"
            >
                {displayTokens.slice(0, 50).map(token => { // Limit for performance
                    const isSelected = selectedIds.has(token.address);
                    return (
                        <motion.button
                            key={token.address}
                            variants={listItemVariants}
                            whileTap={{ scale: 0.95 }}
                            disabled={isSelected}
                            onClick={(e) => triggerAddAnimation(e, token)}
                            className={`border rounded-2xl p-3 flex items-center gap-3 text-left transition-all duration-300 ${isSelected ? 'bg-black/40 border-white/5 opacity-30 grayscale' : 'bg-[#1c1917] hover:bg-[#292524] border-white/5'}`}
                        >
                            <TokenImage src={token.logoURI} className="w-8 h-8 rounded-full bg-black" />
                            <div className="min-w-0">
                                <div className="font-bold text-sm text-white truncate">{token.symbol}</div>
                                <div className="text-[10px] text-white/30 truncate">{token.name}</div>
                            </div>
                            {!isSelected && <div className="ml-auto w-6 h-6 rounded-full border border-white/10 flex items-center justify-center text-white/30"><Plus size={14} /></div>}
                        </motion.button>
                    );
                })}
            </motion.div>
        </div>
      </motion.div>

      {/* Flying Particle */}
      <AnimatePresence>
        {flyingToken && (
           <motion.div
             initial={{ position: 'fixed', left: flyingToken.x, top: flyingToken.y, x: "-50%", y: "-50%", scale: 1, opacity: 1 }}
             animate={{ left: "50%", top: "30%", scale: 0.5, opacity: 0 }}
             transition={{ duration: 0.5, ease: "backIn" }}
             onAnimationComplete={handleAnimationComplete}
             className="z-50 pointer-events-none"
           >
             <div className="w-16 h-16 rounded-full bg-[#222] border-2 border-orange-500 flex items-center justify-center overflow-hidden">
               <TokenImage src={flyingToken.token.logoURI} className="w-full h-full object-cover" />
             </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* FAB: Next to Identity */}
      <div className="absolute bottom-6 left-6 right-6 z-50 pointer-events-none">
          <AnimatePresence>
            {step === 'builder' && portfolio.length >= 2 && totalWeight === 100 && (
                <motion.button
                    initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                    onClick={handleToIdentity}
                    className="w-full py-4 bg-white text-black font-bold text-lg rounded-2xl shadow-xl flex items-center justify-center gap-2 pointer-events-auto hover:bg-gray-200 transition-colors"
                >
                    Next: Strategy Identity <ChevronRight size={20} />
                </motion.button>
            )}
          </AnimatePresence>
      </div>

      {/* ========================================================= */}
      {/* === STEP 2: IDENTITY FORM (Full Screen) === */}
      {/* ========================================================= */}
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

                        {/* Ticker Input */}
                        <AnimatedField isActive={focusedField === 'ticker'} onClick={() => setFocusedField('ticker')} label="Ticker Symbol" icon={Sparkles}>
                             <div className="flex items-center gap-4">
                                <div className={`text-4xl font-black ${focusedField === 'ticker' ? 'text-orange-500' : 'text-white/20'}`}>$</div>
                                <div className="flex-1 relative">
                                    <input 
                                        type="text" maxLength={5} value={config.ticker}
                                        onFocus={() => { setFocusedField('ticker'); triggerHaptic(); }}
                                        onChange={(e) => setConfig({ ...config, ticker: e.target.value.toUpperCase() })}
                                        placeholder="MEME"
                                        className="w-full bg-transparent text-5xl font-black tracking-widest placeholder:text-white/10 focus:outline-none uppercase text-white caret-orange-500"
                                    />
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); generateRandomTicker(); }} className="p-3 bg-white/5 rounded-xl text-white/30 hover:text-white"><RefreshCw size={20} /></button>
                             </div>
                        </AnimatedField>

                        {/* Name Input */}
                        <AnimatedField isActive={focusedField === 'name'} onClick={() => setFocusedField('name')} label="Strategy Name" icon={Type}>
                            <input 
                                type="text" maxLength={30} value={config.name}
                                onFocus={() => { setFocusedField('name'); triggerHaptic(); }}
                                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                                placeholder="My Alpha Fund"
                                className="w-full bg-transparent text-xl font-bold placeholder:text-white/10 focus:outline-none text-white py-2"
                            />
                        </AnimatedField>

                        {/* Description Input */}
                        <AnimatedField isActive={focusedField === 'desc'} onClick={() => setFocusedField('desc')} label="Thesis / Description" icon={FileText}>
                             <textarea 
                                rows={4} value={config.description}
                                onFocus={() => { setFocusedField('desc'); triggerHaptic(); }}
                                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                                placeholder="Investment thesis..."
                                className="w-full bg-transparent text-base text-white/90 placeholder:text-white/10 focus:outline-none resize-none leading-relaxed"
                            />
                        </AnimatedField>

                        {/* Summary Info */}
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
                        className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-2xl transition-all ${(!config.ticker || !config.name) ? 'bg-[#222] text-white/20 cursor-not-allowed translate-y-2 opacity-50' : 'bg-white text-black hover:scale-[1.02] active:scale-95'}`}
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