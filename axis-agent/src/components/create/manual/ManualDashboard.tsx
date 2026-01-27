import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, ArrowRight, X, Loader2, BarChart3,
  RefreshCw, Percent, Rocket, Info,
  DollarSign, Zap, AlertTriangle
} from 'lucide-react';
import { JupiterService, type JupiterToken } from '../../../services/jupiter';
import { BacktestChart } from '../../common/BacktestChart';
import { PortfolioItem } from './PortfolioItem'; // ★分離したコンポーネント
import { TokenImage } from '../../common/TokenImage'; // ★分離した画像コンポーネント

// --- Types ---
export interface ManualData {
  tokens: { symbol: string; weight: number; mint: string }[];
  config: StrategyConfig;
}

interface StrategyConfig {
  name: string;
  ticker: string;
  description: string;
  curatorFee: number;
  protocolFee: number;
  swapFee: number;
  rebalanceTrigger: 'THRESHOLD' | 'PERIODIC';
  rebalanceValue: number;
}

interface AssetItem {
  token: JupiterToken;
  weight: number;
  locked: boolean;
}

interface ManualDashboardProps {
  onDeploySuccess: (data: ManualData) => void;
}

const numberStyle = { fontFamily: '"Times New Roman", Times, serif' };

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(10);
  }
};

// --- Simulation Logic (Outside component to avoid recreation) ---
const generateSimulationData = (portfolio: AssetItem[]) => {
  const days = 30;
  let currentValue = 1000;
  const values: number[] = [1000];
  
  let totalVol = 0;
  let baseReturn = 0;

  portfolio.forEach(p => {
    const symbol = p.token.symbol.toUpperCase();
    const isStable = ['USDC', 'USDT', 'DAI', 'PYUSD'].some(s => symbol.includes(s));
    const isMajor = ['SOL', 'ETH', 'BTC', 'JUP'].some(s => symbol.includes(s));
    
    if (isStable) {
      totalVol += 0.002 * (p.weight / 100);
      baseReturn += 0.0003 * (p.weight / 100);
    } else if (isMajor) {
      totalVol += 0.04 * (p.weight / 100);
      baseReturn += 0.003 * (p.weight / 100);
    } else {
      totalVol += 0.08 * (p.weight / 100);
      baseReturn += 0.006 * (p.weight / 100);
    }
  });

  if (portfolio.length === 0) { totalVol = 0.02; baseReturn = 0.001; }

  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.45) * totalVol; 
    currentValue = currentValue * (1 + baseReturn + change);
    values.push(currentValue);
  }
  
  return {
    values,
    sharpeRatio: 1.5 + (Math.random() * 0.5),
    maxDrawdown: -(totalVol * 100 * 2), 
    volatility: totalVol * 100 * Math.sqrt(365)
  };
};

export const ManualDashboard = ({ onDeploySuccess }: ManualDashboardProps) => {
  // --- Data ---
  const [defaultTokens, setDefaultTokens] = useState<JupiterToken[]>([]);
  const [displayedTokens, setDisplayedTokens] = useState<JupiterToken[]>([]);
  const [portfolio, setPortfolio] = useState<AssetItem[]>([]);
  
  // --- Config ---
  const [config, setConfig] = useState<StrategyConfig>({
    name: '',
    ticker: '',
    description: '',
    curatorFee: 0.5,
    protocolFee: 0.20,
    swapFee: 0.1,
    rebalanceTrigger: 'THRESHOLD',
    rebalanceValue: 2.5,
  });

  // --- UI Flags ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [chartData, setChartData] = useState<{ values: number[]; sharpeRatio?: number; maxDrawdown?: number }>({ values: [] });
  const [roi, setRoi] = useState(0);

  // --- Optimization: useCallback ---
  // ハンドラーをメモ化して、子コンポーネントの不要な再レンダリングを防ぐ

  const updateWeight = useCallback((address: string, newWeight: number) => {
    setPortfolio(prev => prev.map(p => 
      p.token.address === address ? { ...p, weight: Math.min(100, Math.max(0, newWeight)) } : p
    ));
  }, []);

  const toggleLock = useCallback((address: string) => {
    triggerHaptic();
    setPortfolio(prev => prev.map(p => 
      p.token.address === address ? { ...p, locked: !p.locked } : p
    ));
  }, []);

  const removeToken = useCallback((address: string) => {
    triggerHaptic();
    setPortfolio(prev => prev.filter(p => p.token.address !== address));
  }, []);

  const addToken = useCallback((token: JupiterToken) => {
    triggerHaptic();
    setPortfolio(prev => {
      if (prev.some(p => p.token.address === token.address)) return prev;
      const currentTotal = prev.reduce((sum, i) => sum + i.weight, 0);
      const remaining = Math.max(0, 100 - currentTotal);
      return [...prev, { token, weight: remaining, locked: false }];
    });
    setIsSearchOpen(false);
    setSearchQuery('');
  }, []);

  const autoBalance = useCallback(() => {
    triggerHaptic();
    setPortfolio(prev => {
      const lockedItems = prev.filter(p => p.locked);
      const unlockedItems = prev.filter(p => !p.locked);
      if (unlockedItems.length === 0) return prev;

      const lockedWeight = lockedItems.reduce((sum, p) => sum + p.weight, 0);
      const targetWeight = 100 - lockedWeight;
      if (targetWeight < 0) return prev;

      const perItem = Math.floor(targetWeight / unlockedItems.length);
      const remainder = targetWeight % unlockedItems.length;

      return prev.map(p => {
        if (p.locked) return p;
        // 最初の非ロックアイテムに残りを加算
        const isFirst = unlockedItems[0].token.address === p.token.address;
        return { ...p, weight: perItem + (isFirst ? remainder : 0) };
      });
    });
  }, []);

  // Init Data
  useEffect(() => {
    const init = async () => {
      const list = await JupiterService.getLiteList();
      setDefaultTokens(list);
      setDisplayedTokens(list);
    };
    init();
  }, []);

  // Search Logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDisplayedTokens(defaultTokens);
      setIsSearching(false);
      return;
    }
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await JupiterService.searchTokens(searchQuery);
        setDisplayedTokens(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, defaultTokens]);

  const totalWeight = useMemo(() => portfolio.reduce((sum, i) => sum + i.weight, 0), [portfolio]);

  const runSimulation = () => {
    triggerHaptic();
    setIsSimulating(true);
    setShowChart(true);
    setTimeout(() => {
      const data = generateSimulationData(portfolio);
      setChartData(data);
      if(data.values.length > 0) {
        const start = data.values[0];
        const end = data.values[data.values.length - 1];
        setRoi(((end - start) / start) * 100);
      }
      setIsSimulating(false);
    }, 800); // Wait time reduced for snappy feel
  };

  const handleDeploy = () => {
    console.log('=== ManualDashboard handleDeploy called ===', new Date().toISOString());
    triggerHaptic();
    if (!config.name || !config.ticker) return;
    
    onDeploySuccess({
      tokens: portfolio.map(p => ({
        symbol: p.token.symbol,
        weight: p.weight,
        mint: p.token.address,      // ★必須: Mintアドレス
        logoURI: p.token.logoURI    // ★必須: 画像がないと確認画面でアイコンが出ない
      })),
      config: {
          ...config,
          // ★必須: UIに選択肢がなくても、デフォルト値として渡す必要がある
          strategyType: config.strategyType || 'BALANCED' 
      }
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]  text-white relative overflow-hidden">
      
      {/* --- Step 1 Header --- */}
      <div className="flex-none px-4 py-3 flex items-center justify-between border-b border-white/5 bg-[#050505]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Weights</span>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold ${totalWeight === 100 ? 'text-emerald-400' : 'text-orange-500'}`} style={numberStyle}>
              {totalWeight}%
            </span>
            {totalWeight !== 100 && (
              <button onClick={autoBalance} className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-1 rounded font-bold hover:bg-orange-500/20 transition-colors">
                AUTO FIX
              </button>
            )}
          </div>
        </div>
        
        <button 
          onClick={runSimulation}
          disabled={portfolio.length === 0}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 hover:text-emerald-400 transition-colors disabled:opacity-30"
        >
          <BarChart3 size={20} />
        </button>
      </div>

      {/* --- Chart Area --- */}
      <AnimatePresence>
        {showChart && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="flex-none bg-[#080808] border-b border-white/5 overflow-hidden"
          >
            <div className="p-4 relative">
              <button onClick={() => setShowChart(false)} className="absolute top-2 right-2 p-1 bg-white/5 rounded-full z-10">
                <X size={14} className="text-white/50" />
              </button>
              {isSimulating ? (
                <div className="h-40 flex items-center justify-center gap-2 text-white/30">
                  <RefreshCw className="animate-spin w-4 h-4" /> Calculating...
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-xs text-white/40 uppercase">Expected ROI (30d)</span>
                    <span className={`text-2xl font-bold ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`} style={numberStyle}>
                      {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
                    </span>
                  </div>
                  <BacktestChart data={chartData} height={140} showMetrics={false} />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Asset List (Optimized) --- */}
      <div className="flex-1 overflow-y-auto pb-32 custom-scrollbar p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {portfolio.length === 0 && (
            <div className="text-center py-20 text-white/20">
              <p className="text-sm">Start building your ETF</p>
              <p className="text-xs mt-1">Select assets to include</p>
            </div>
          )}
          {portfolio.map((item) => (
            // ★ 高速化ポイント: Memo化したコンポーネントを使用
            <PortfolioItem
              key={item.token.address}
              item={item}
              numberStyle={numberStyle}
              onUpdateWeight={updateWeight}
              onToggleLock={toggleLock}
              onRemove={removeToken}
              triggerHaptic={triggerHaptic}
            />
          ))}
        </AnimatePresence>

        <button
          onClick={() => { triggerHaptic(); setIsSearchOpen(true); }}
          className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-white/30 hover:text-white hover:border-white/30 transition-all flex flex-col items-center justify-center gap-1 group active:scale-95"
        >
          <Plus size={24} className="group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-wider">Add Asset</span>
        </button>
      </div>

      {/* --- Footer Button --- */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent z-10">
        <button
          disabled={totalWeight !== 100 || portfolio.length < 2}
          onClick={() => { triggerHaptic(); setIsConfigOpen(true); }}
          className="w-full py-4 bg-white text-black font-bold text-lg rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-orange-400 transition-all shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 active:scale-95"
        >
          Next: Configure
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* --- MODAL 1: Search --- */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end lg:items-center justify-center"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full lg:w-[480px] h-[80vh] lg:h-[600px] bg-[#111] border-t border-white/10 rounded-t-3xl flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <Search className="w-5 h-5 text-white/40" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search tokens..."
                  className="flex-1 bg-transparent text-lg font-bold outline-none placeholder:text-white/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {isSearching && <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />}
                <button onClick={() => setIsSearchOpen(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {displayedTokens.map((token) => {
                  const isSelected = portfolio.some(p => p.token.address === token.address);
                  return (
                    <button
                      key={token.address}
                      onClick={() => addToken(token)}
                      disabled={isSelected}
                      className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 disabled:opacity-30 text-left transition-colors border-b border-white/5 last:border-0"
                    >
                      <TokenImage 
                        src={token.logoURI} 
                        alt={token.symbol}
                        className="w-10 h-10 rounded-full bg-white/10 object-cover"
                      />
                      <div className="flex-1">
                        <div className="font-bold">{token.symbol}</div>
                        <div className="text-xs text-white/40">{token.name}</div>
                      </div>
                      {isSelected && <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">ADDED</span>}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: Config (Step 2) --- */}
      {/* NOTE: Step 2 Modal implementation is large but same as before. 
          It's not the main performance bottleneck, so keeping it inside is fine 
          as long as it's conditionally rendered. */}
      <AnimatePresence>
        {isConfigOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-end lg:items-center justify-center"
            onClick={() => setIsConfigOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full lg:w-[500px] h-[95vh] lg:h-auto lg:max-h-[90vh] bg-[#111] border-t lg:border border-white/10 rounded-t-3xl lg:rounded-3xl flex flex-col overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#111]">
                <div>
                  <h3 className="text-xl font-bold">Configure Strategy</h3>
                  <p className="text-xs text-white/40">Details & Economics</p>
                </div>
                <button onClick={() => setIsConfigOpen(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><X size={20} /></button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                
                {/* 1. Identity */}
                <section>
                  <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">1. Identity</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-white/70">Name</label>
                      <input 
                        type="text" placeholder="Solana DeFi Index"
                        value={config.name}
                        onChange={e => setConfig({...config, name: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold focus:border-orange-500/50 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-white/70">Ticker</label>
                      <input 
                        type="text" placeholder="SOL-IDX" maxLength={8}
                        value={config.ticker}
                        onChange={e => setConfig({...config, ticker: e.target.value.toUpperCase()})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono font-bold uppercase focus:border-orange-500/50 outline-none"
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <label className="text-xs text-white/70">Description</label>
                    <textarea 
                      rows={3}
                      placeholder="Strategy rationale..."
                      value={config.description}
                      onChange={e => setConfig({...config, description: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-orange-500/50 outline-none resize-none"
                    />
                  </div>
                </section>

                {/* 2. Economics */}
                <section>
                  <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">2. Economics</h4>
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-6">
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <label className="text-sm font-bold flex items-center gap-1">
                          Curator Fee <span className="text-emerald-400 text-xs font-normal">(Your Earnings)</span>
                        </label>
                        <span className="text-2xl font-bold text-emerald-400" style={numberStyle}>
                          {config.curatorFee.toFixed(1)}%
                        </span>
                      </div>
                      <input 
                        type="range" min="0" max="5" step="0.1"
                        value={config.curatorFee}
                        onChange={e => setConfig({...config, curatorFee: parseFloat(e.target.value)})}
                        className="w-full accent-emerald-500 h-2 bg-white/10 rounded-full appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="bg-black/40 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Your Earnings</span>
                        <span className="text-emerald-400 font-bold" style={numberStyle}>{config.curatorFee.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Protocol Fee (Axis)</span>
                        <span className="text-white/60 font-bold" style={numberStyle}>{config.protocolFee.toFixed(2)}%</span>
                      </div>
                      <div className="h-px bg-white/10 my-2" />
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-white/90">Total Cost</span>
                        <span className={`font-bold text-lg ${ (config.curatorFee + config.protocolFee) > 1.5 ? 'text-red-400' : 'text-white' }`} style={numberStyle}>
                          {(config.curatorFee + config.protocolFee).toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between">
                      <div className="text-[10px] text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Revenue Sim ($1M TVL)
                      </div>
                      <div className="text-lg font-bold text-white" style={numberStyle}>
                        ${(1000000 * (config.curatorFee / 100)).toLocaleString()} <span className="text-xs text-white/40 font-sans">/yr</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. Rebalancing */}
                <section>
                  <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">3. Rebalancing</h4>
                  <div className="p-1 bg-white/5 rounded-xl flex mb-4">
                    <button
                      onClick={() => setConfig({...config, rebalanceTrigger: 'THRESHOLD'})}
                      className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${config.rebalanceTrigger === 'THRESHOLD' ? 'bg-white text-black' : 'text-white/40'}`}
                    >
                      <Zap size={14} /> Threshold
                    </button>
                    <button
                      onClick={() => setConfig({...config, rebalanceTrigger: 'PERIODIC'})}
                      className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${config.rebalanceTrigger === 'PERIODIC' ? 'bg-white text-black' : 'text-white/40'}`}
                    >
                      <RefreshCw size={14} /> Periodic
                    </button>
                  </div>

                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-sm font-bold">{config.rebalanceTrigger === 'THRESHOLD' ? 'Deviation Threshold' : 'Frequency'}</label>
                      <span className="font-bold text-orange-400" style={numberStyle}>
                        {config.rebalanceValue}{config.rebalanceTrigger === 'THRESHOLD' ? '%' : ' Days'}
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max={config.rebalanceTrigger === 'THRESHOLD' ? 10 : 30} 
                      step={config.rebalanceTrigger === 'THRESHOLD' ? 0.5 : 1}
                      value={config.rebalanceValue}
                      onChange={e => setConfig({...config, rebalanceValue: parseFloat(e.target.value)})}
                      className="w-full accent-orange-500 h-1.5 bg-white/10 rounded-full cursor-pointer"
                    />
                  </div>
                </section>
              </div>

              {/* Deploy Button */}
              <div className="p-5 border-t border-white/10 bg-[#111]">
                <button 
                  disabled={!config.name || !config.ticker}
                  onClick={handleDeploy}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-black font-bold text-lg rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Rocket className="w-5 h-5" />
                  Deploy Strategy
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};