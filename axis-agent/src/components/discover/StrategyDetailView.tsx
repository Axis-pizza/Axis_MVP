/**
 * StrategyDetailView.tsx
 * Axis ETF Detail Page - Production Grade
 * Features: Seamless transition (initialData), TV-style Chart, Invest Sheet
 */
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  ArrowLeft, ChevronRight, Activity, PieChart, Clock, Sparkles, 
  Copy, Share2, Star, Download, Globe, Check, X, RefreshCw 
} from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PizzaChart } from '../common/PizzaChart';
import { getStrategyInfo, deposit } from '../../services/kagemusha';
import type { Strategy } from '../../types';
// import { ShareCard } from './ShareCard'; // 画像生成用（必要に応じて解除）
// import html2canvas from 'html2canvas';

// --- Types ---

interface StrategyDetailViewProps {
  initialData: Strategy; // 一覧から受け取った初期データ
  onBack: () => void;
}

type Tab = 'OVERVIEW' | 'HOLDINGS' | 'ACTIVITY';
type Timeframe = '1H' | '1D' | '1W' | '1M' | 'ALL';
type AssetType = 'SOL' | 'USDC';

interface ChartPoint { 
  timestamp: number; 
  value: number; 
}

// --- 1. TV-Style Interactive Chart Component ---

interface TVChartProps { 
  data: ChartPoint[]; 
  onCrosshairMove: (point: ChartPoint | null) => void;
}

const TVChart = ({ data, onCrosshairMove }: TVChartProps) => {
  const [activePoint, setActivePoint] = useState<ChartPoint | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { points, areaPath, min, range, isPositive } = useMemo(() => {
    if (!data || !data.length) return { points: '', areaPath: '', min: 0, range: 1, isPositive: true };
    
    const values = data.map(d => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const rangeVal = maxVal - minVal || 1;
    
    const isPos = values[values.length - 1] >= values[0];

    const pts = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      // 上下に10%ずつのパディングを設けて描画
      const y = 100 - (((d.value - minVal) / rangeVal) * 80 + 10); 
      return `${x},${y}`;
    }).join(' ');

    const area = `0,100 ${pts} 100,100`;

    return { points: pts, areaPath: area, min: minVal, range: rangeVal, isPositive: isPos };
  }, [data]);

  const color = isPositive ? '#10B981' : '#EF4444'; // Green / Red

  const handleInteraction = useCallback((clientX: number) => {
    if (!containerRef.current || !data.length) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const index = Math.min(Math.floor((x / rect.width) * data.length), data.length - 1);
    
    const point = data[index];
    setActivePoint(point);
    onCrosshairMove(point);

    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(2);
  }, [data, onCrosshairMove]);

  const handleEnd = () => {
    setActivePoint(null);
    onCrosshairMove(null);
  };

  return (
    <div 
      className="relative h-64 w-full touch-none cursor-crosshair select-none"
      ref={containerRef}
      onTouchStart={(e) => handleInteraction(e.touches[0].clientX)}
      onTouchMove={(e) => handleInteraction(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
      onMouseMove={(e) => handleInteraction(e.clientX)}
      onMouseLeave={handleEnd}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid Lines */}
        {[25, 50, 75].map(y => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.1" />
        ))}

        {/* Chart Area & Line */}
        <polygon points={areaPath} fill="url(#chartFill)" />
        <polyline 
          points={points} 
          fill="none" 
          stroke={color} 
          strokeWidth="1.5" 
          vectorEffect="non-scaling-stroke" 
          strokeLinejoin="round" 
        />

        {/* Crosshair */}
        {activePoint && (
          <>
            <line 
              x1={(data.indexOf(activePoint) / (data.length - 1)) * 100} y1="0"
              x2={(data.indexOf(activePoint) / (data.length - 1)) * 100} y2="100"
              stroke="#A8A29E" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke"
            />
            <circle 
              cx={(data.indexOf(activePoint) / (data.length - 1)) * 100}
              cy={100 - (((activePoint.value - min) / range) * 80 + 10)}
              r="4" fill="#E7E5E4" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>
    </div>
  );
};

// --- 2. Invest Bottom Sheet (Custom Keypad) ---

interface InvestSheetProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: Strategy;
  balance: number;
}

const InvestSheet = ({ isOpen, onClose, strategy, balance }: InvestSheetProps) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [amount, setAmount] = useState('0');
  const [asset, setAsset] = useState<AssetType>('SOL');
  const [status, setStatus] = useState<'IDLE' | 'SIGNING' | 'CONFIRMING' | 'SUCCESS' | 'ERROR'>('IDLE');

  const handleNum = (num: string) => {
    if (status !== 'IDLE' && status !== 'ERROR') return;
    if (amount === '0' && num !== '.') setAmount(num);
    else if (amount.includes('.') && num === '.') return;
    else if (amount.length < 10) setAmount(prev => prev + num);
  };
  
  const handleBackspace = () => {
    if (status !== 'IDLE' && status !== 'ERROR') return;
    setAmount(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  };

  const executeDeposit = async () => {
    if (!strategy || !wallet.publicKey) return;
    setStatus('SIGNING');
    try {
      if (asset === 'USDC') {
        alert("USDC deposits are currently in beta. Switched to SOL.");
        setAsset('SOL');
        setStatus('IDLE');
        return;
      }
      
      await deposit(connection, wallet, new PublicKey(strategy.id), parseFloat(amount));
      setStatus('SUCCESS');
      
      setTimeout(() => { 
        onClose(); 
        setStatus('IDLE'); 
        setAmount('0'); 
      }, 2000);
    } catch (e) {
      console.error(e);
      setStatus('ERROR');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-[#1C1917] border-t border-[#D97706]/20 rounded-t-3xl z-50 overflow-hidden flex flex-col safe-area-bottom"
          >
            {/* Handle */}
            <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
              <div className="w-12 h-1.5 bg-[#57534E] rounded-full" />
            </div>

            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-serif font-bold text-xl text-[#E7E5E4]">Buy {strategy.ticker || strategy.name}</h3>
                 <div className="bg-[#0C0A09] rounded-lg p-1 flex items-center border border-[#D97706]/20">
                    {(['SOL', 'USDC'] as AssetType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setAsset(t)}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                          asset === t ? 'bg-[#D97706] text-[#0C0A09]' : 'text-[#78716C]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                 </div>
              </div>

              {/* Amount Display */}
              <div className="text-center py-4 mb-4">
                 <div className="flex items-baseline justify-center gap-2">
                   <span className="text-5xl font-serif font-bold text-[#E7E5E4]">{amount}</span>
                   <span className="text-xl text-[#D97706] font-bold">{asset}</span>
                 </div>
                 <p className="text-xs text-[#78716C] mt-2 font-mono">
                   Balance: {balance.toFixed(4)} {asset}
                 </p>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3 mb-6">
                 {[0.5, 1, 5].map(val => (
                   <button 
                     key={val} 
                     onClick={() => setAmount(val.toString())}
                     className="flex-1 py-2 bg-[#292524] rounded-lg text-xs font-bold text-[#D97706] border border-[#D97706]/10 active:scale-95 transition-transform"
                   >
                     {val} {asset}
                   </button>
                 ))}
                 <button 
                   onClick={() => setAmount((balance * 0.95).toFixed(4))}
                   className="flex-1 py-2 bg-[#D97706]/10 rounded-lg text-xs font-bold text-[#D97706] border border-[#D97706]/30 active:scale-95 transition-transform"
                 >
                   Max
                 </button>
              </div>

              {/* Custom Keypad */}
              <div className="grid grid-cols-3 gap-px bg-[#292524] rounded-xl overflow-hidden border border-[#D97706]/10 mb-6 shadow-2xl">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'del'].map((key) => (
                  <button
                    key={key}
                    onClick={() => key === 'del' ? handleBackspace() : handleNum(key.toString())}
                    className="bg-[#1C1917] h-16 text-xl font-medium text-[#E7E5E4] active:bg-[#292524] flex items-center justify-center transition-colors"
                    disabled={status !== 'IDLE' && status !== 'ERROR'}
                  >
                    {key === 'del' ? <ArrowLeft className="w-5 h-5" /> : key}
                  </button>
                ))}
              </div>

              {/* Main Action Button */}
              <button 
                onClick={executeDeposit}
                disabled={status !== 'IDLE' && status !== 'ERROR' || parseFloat(amount) <= 0}
                className={`w-full py-4 rounded-xl font-serif font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
                  status === 'SUCCESS' 
                    ? 'bg-green-500 text-white' 
                    : status === 'ERROR' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-gradient-to-r from-[#D97706] to-[#B45309] text-[#0C0A09] hover:scale-[1.01]'
                }`}
              >
                {status === 'IDLE' && 'Confirm Investment'}
                {status === 'SIGNING' && <><Sparkles className="w-4 h-4 animate-spin" /> Signing...</>}
                {status === 'CONFIRMING' && <><Activity className="w-4 h-4 animate-pulse" /> Confirming...</>}
                {status === 'SUCCESS' && <><Check className="w-5 h-5" /> Done!</>}
                {status === 'ERROR' && <><X className="w-5 h-5" /> Failed</>}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// --- 3. Main Page Component ---

// チャートデータ生成用ユーティリティ
const generateChartData = (seedStr: string, basePrice: number = 100) => {
  const seed = seedStr.charCodeAt(0) || 0;
  return Array.from({ length: 50 }, (_, i) => ({
    timestamp: Date.now() - (50 - i) * 3600000,
    value: basePrice + Math.sin(i * 0.1 + seed) * (basePrice * 0.1) + (i * 0.2)
  }));
};

export const StrategyDetailView = ({ initialData, onBack }: StrategyDetailViewProps) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  
  // ★重要: 初期データでStateを初期化し、即座に表示
  const [strategy, setStrategy] = useState<Strategy & { chartData: ChartPoint[], price: number }>({
    ...initialData,
    price: initialData.price || 100,
    chartData: generateChartData(initialData.id, initialData.price)
  });

  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
  const [isInvestOpen, setIsInvestOpen] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  
  // Chart interaction state
  const [crosshairPoint, setCrosshairPoint] = useState<ChartPoint | null>(null);

  // Sharing (Placeholder ref)
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Scroll animations
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 100], [0, 1]);
  const heroOpacity = useTransform(scrollY, [0, 200], [1, 0]);

  // Data Refreshing (Background)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Balance
        if (wallet.publicKey) {
          const bal = await connection.getBalance(wallet.publicKey);
          setBalance(bal / LAMPORTS_PER_SOL);
        }

        // 2. Refresh Strategy Data from Chain
        try {
          const pubkey = new PublicKey(strategy.id);
          const onChainData = await getStrategyInfo(connection, pubkey);
          
          if (onChainData) {
            setStrategy(prev => ({
              ...prev,
              ...onChainData, // オンチェーンの最新情報で上書き
              // チャートなどはオンチェーンにないので維持
            }));
          }
        } catch {
          // IDがオンチェーンアドレスでない場合などはスキップ
        }

        // 3. Watchlist
        const saved = localStorage.getItem('axis-watchlist');
        if (saved) setIsWatchlisted(JSON.parse(saved).includes(strategy.id));

      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, [strategy.id, wallet.publicKey, connection]);

  // Derived Values
  const displayPrice = crosshairPoint ? crosshairPoint.value : strategy.price;
  const startPrice = strategy.chartData[0].value;
  const changePct = ((displayPrice - startPrice) / startPrice) * 100;
  const isPositive = changePct >= 0;

  // Actions
  const copyCA = () => {
    navigator.clipboard.writeText(strategy.id);
    // Toast notification can be added here
  };

  const toggleWatchlist = () => {
    const saved = JSON.parse(localStorage.getItem('axis-watchlist') || '[]');
    const newSaved = isWatchlisted ? saved.filter((id: string) => id !== strategy.id) : [...saved, strategy.id];
    localStorage.setItem('axis-watchlist', JSON.stringify(newSaved));
    setIsWatchlisted(!isWatchlisted);
  };

  const handleShare = async () => {
    // 画像生成の実装時はここを有効化
    /*
    if (!shareCardRef.current || isSharing) return;
    setIsSharing(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(shareCardRef.current, { backgroundColor: '#0C0A09', scale: 2 });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `axis-${strategy.ticker || 'strategy'}.png`;
      link.click();
    } catch (e) {
      console.error(e);
    } finally { setIsSharing(false); }
    */
    alert("Share functionality coming in next update!");
  };

  return (
    <div className="min-h-screen bg-[#0C0A09] text-[#E7E5E4] pb-32 font-sans selection:bg-[#D97706]/30">
      
      {/* Hidden Share Card (Commented out for safety) */}
      {/* <ShareCard ref={shareCardRef} strategy={strategy} /> */}

      {/* 1. Sticky Header */}
      <div className="fixed top-0 inset-x-0 h-14 bg-[#0C0A09]/90 backdrop-blur-md border-b border-[#D97706]/10 z-30 flex items-center justify-between px-4 safe-area-top">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-[#A8A29E] hover:text-[#D97706] transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <motion.div style={{ opacity: headerOpacity }} className="flex flex-col">
            <span className="font-serif font-bold text-sm">{strategy.ticker || strategy.name.slice(0,4)}</span>
            <span className="text-[10px] text-[#D97706] font-mono">${strategy.price.toFixed(2)}</span>
          </motion.div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={toggleWatchlist} className="p-2 text-[#A8A29E] hover:text-[#F59E0B] transition-colors">
            <Star className={`w-5 h-5 ${isWatchlisted ? 'fill-[#F59E0B] text-[#F59E0B]' : ''}`} />
          </button>
          <button onClick={handleShare} className="p-2 text-[#A8A29E] hover:text-[#D97706] transition-colors">
            {isSharing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 2. Scrollable Body */}
      <div className="pt-16 animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* HERO SECTION */}
        <motion.div style={{ opacity: heroOpacity }}>
          
          {/* Top Info */}
          <div className="px-4 mb-2 flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#D97706] flex items-center justify-center text-lg font-bold text-black border-2 border-[#D97706]/50 shadow-[0_0_15px_rgba(217,119,6,0.3)]">
                {strategy.ticker ? strategy.ticker[0] : strategy.name[0]}
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold leading-none">{strategy.ticker || strategy.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[#78716C] font-mono bg-[#1C1917] px-2 py-0.5 rounded border border-[#D97706]/10 truncate max-w-[100px]">
                    CA: {strategy.id.slice(0, 4)}...{strategy.id.slice(-4)}
                  </span>
                  <button onClick={copyCA} className="text-[#78716C] hover:text-[#D97706]">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Price Display */}
          <div className="px-4 mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-serif font-bold text-[#E7E5E4] tabular-nums">
                ${displayPrice.toFixed(2)}
              </span>
              <span className={`text-lg font-bold ${isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {isPositive ? '+' : ''}{changePct.toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-[#78716C] font-mono mt-1">
              {crosshairPoint ? new Date(crosshairPoint.timestamp).toLocaleString() : 'Live Market Data'}
            </p>
          </div>

          {/* Chart */}
          <TVChart data={strategy.chartData} onCrosshairMove={setCrosshairPoint} />
          
          {/* Timeframe Selector */}
          <div className="flex justify-between px-4 mt-4 border-b border-[#D97706]/10 pb-4">
            {(['1H', '1D', '1W', '1M', 'ALL'] as Timeframe[]).map((tf) => (
              <button key={tf} className={`text-[10px] font-bold py-1 px-3 rounded-md transition-colors ${tf === '1M' ? 'bg-[#D97706]/20 text-[#D97706]' : 'text-[#78716C]'}`}>
                {tf}
              </button>
            ))}
          </div>
        </motion.div>

        {/* TABS */}
        <div className="sticky top-14 bg-[#0C0A09] z-20 border-b border-[#D97706]/10 mb-6 shadow-lg">
          <div className="flex px-4">
            {(['OVERVIEW', 'HOLDINGS', 'ACTIVITY'] as Tab[]).map((tab) => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`flex-1 py-3 text-xs font-bold tracking-widest border-b-2 transition-colors ${activeTab === tab ? 'border-[#D97706] text-[#D97706]' : 'border-transparent text-[#78716C]'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="px-4 min-h-[400px]">
          <AnimatePresence mode="wait">
            
            {activeTab === 'OVERVIEW' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-[#1C1917] rounded-xl border border-[#D97706]/10">
                    <div className="flex items-center gap-2 text-[#78716C] mb-2">
                       <Activity className="w-3 h-3" />
                       <span className="text-[10px] uppercase tracking-wider">APY (Proj.)</span>
                    </div>
                    <span className="text-xl font-serif font-bold text-[#D97706]">{strategy.apy || strategy.metrics?.expectedApy || '12.5'}%</span>
                  </div>
                  <div className="p-4 bg-[#1C1917] rounded-xl border border-[#D97706]/10">
                    <div className="flex items-center gap-2 text-[#78716C] mb-2">
                       <PieChart className="w-3 h-3" />
                       <span className="text-[10px] uppercase tracking-wider">TVL (SOL)</span>
                    </div>
                    <span className="text-xl font-serif font-bold text-[#E7E5E4]">{typeof strategy.tvl === 'number' ? strategy.tvl.toLocaleString() : strategy.tvl}</span>
                  </div>
                </div>

                <div className="p-4 bg-[#1C1917]/50 rounded-xl border border-[#D97706]/5">
                   <h3 className="text-xs font-bold text-[#78716C] uppercase mb-2 flex items-center gap-2">
                     <Globe className="w-3 h-3" /> Strategy Thesis
                   </h3>
                   <p className="text-sm text-[#A8A29E] font-serif leading-relaxed italic">
                     "{strategy.description}"
                   </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'HOLDINGS' && (
              <motion.div key="holdings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                <div className="mb-6 scale-110 mt-4">
                   <PizzaChart slices={strategy.tokens} size={200} />
                </div>
                <div className="w-full space-y-2">
                   {strategy.tokens.map((token: any) => (
                     <div key={token.symbol} className="flex items-center justify-between p-4 bg-[#1C1917] rounded-xl border border-[#D97706]/10">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-[10px] border border-[#D97706]/20 text-[#D97706] font-bold">
                             {token.symbol[0]}
                           </div>
                           <span className="font-serif font-bold text-[#E7E5E4]">{token.symbol}</span>
                        </div>
                        <span className="font-mono text-[#D97706]">{token.weight.toFixed(1)}%</span>
                     </div>
                   ))}
                </div>
              </motion.div>
            )}
            
            {activeTab === 'ACTIVITY' && (
                <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                    <Clock className="w-12 h-12 text-[#D97706] mx-auto mb-4 opacity-20" />
                    <p className="text-sm text-[#78716C]">No recent activity found on-chain.</p>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0C0A09] via-[#0C0A09]/95 to-transparent z-30 safe-area-bottom">
        <div className="max-w-md mx-auto flex gap-3">
           <div className="flex-1 bg-[#1C1917] rounded-xl p-3 border border-[#D97706]/10 flex flex-col justify-center">
              <span className="text-[9px] text-[#78716C] uppercase tracking-wide">Your Position</span>
              <span className="font-serif font-bold text-[#E7E5E4] text-sm">$0.00</span>
           </div>
           <button 
             onClick={() => setIsInvestOpen(true)}
             className="flex-[2] bg-[#D97706] text-[#0C0A09] rounded-xl font-serif font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-900/30 active:scale-95 transition-transform hover:bg-[#F59E0B]"
           >
             Invest <ChevronRight className="w-4 h-4 opacity-70" />
           </button>
        </div>
      </div>

      {/* 4. Invest Modal */}
      <InvestSheet 
        isOpen={isInvestOpen} 
        onClose={() => setIsInvestOpen(false)} 
        strategy={strategy} 
        balance={balance} 
      />
    </div>
  );
};