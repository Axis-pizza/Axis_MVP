import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useAnimation, useTransform as useMotionTransform } from 'framer-motion';
import { 
  ArrowLeft, Copy, Star, 
  TrendingUp, TrendingDown, Layers, Activity, Sparkles, ChevronRight, PieChart, Wallet, ArrowRight, X, Check
} from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

import { RichChart } from '../common/RichChart';
import { api } from '../../services/api';
// ★修正: 新しい KagemushaService を使用
import { KagemushaService } from '../../services/kagemusha';
import type { Strategy } from '../../types';
import { useToast } from '../../context/ToastContext'; 

// --- Types ---
interface StrategyDetailViewProps {
  initialData: Strategy;
  onBack: () => void;
}
type AssetType = 'SOL' | 'USDC';

// --- Components ---

// 1. Responsive Confirm Action
const ResponsiveConfirmAction = ({ onConfirm, isLoading, label }: { onConfirm: () => void, isLoading: boolean, label: string }) => {
  return (
    <>
      <div className="hidden md:block">
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full h-16 bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-lg rounded-full shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Sparkles className="animate-spin" /> : label}
        </button>
      </div>
      <div className="md:hidden">
        <SwipeToConfirm onConfirm={onConfirm} isLoading={isLoading} label={label} />
      </div>
    </>
  );
};

// 2. Swipe To Confirm
const SwipeToConfirm = ({
  onConfirm,
  isLoading,
  label,
}: {
  onConfirm: () => void;
  isLoading: boolean;
  label: string;
}) => {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [containerWidth, setContainerWidth] = useState(280);

  const HANDLE_SIZE = 56; 
  const PADDING = 4;
  const maxDrag = Math.max(0, containerWidth - HANDLE_SIZE - PADDING * 2);

  const textOpacity = useMotionTransform(x, [0, maxDrag * 0.25], [1, 0]);
  const progressWidth = useMotionTransform(x, [0, maxDrag], [HANDLE_SIZE + PADDING * 2, containerWidth]);
  const progressOpacity = useMotionTransform(x, [0, maxDrag * 0.08], [0, 1]);
  const controls = useAnimation();

  useEffect(() => {
    if (!constraintsRef.current) return;
    const el = constraintsRef.current;
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (isLoading) x.set(maxDrag);
    else x.set(0);
  }, [isLoading, maxDrag, x]);

  const handleDragEnd = () => {
    const current = x.get();
    const threshold = maxDrag * 0.58; 
    if (current > threshold) {
      x.set(maxDrag);
      if (!isLoading) onConfirm();
    } else {
      x.set(0);
    }
  };

  return (
    <div
      ref={constraintsRef}
      className="relative h-16 w-full bg-[#1C1917] rounded-full overflow-hidden border border-white/5 select-none shadow-[inset_0_4px_8px_rgba(0,0,0,0.5)] p-1 box-border"
    >
      <motion.div
        className="absolute inset-y-0 left-0 bg-[#D97706] rounded-full z-0"
        style={{ width: progressWidth, opacity: isLoading ? 1 : progressOpacity }}
      />
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        style={{ opacity: textOpacity }}
      >
        <span className={`font-serif font-bold text-sm tracking-[0.2em] transition-colors duration-300 ${isLoading ? "text-white" : "text-white/40"}`}>
          {isLoading ? "PROCESSING..." : `SLIDE TO ${label}`}
        </span>
      </motion.div>
      <motion.div
        drag={isLoading ? false : "x"}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.02}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x, touchAction: "pan-x" }}
        className="relative w-14 h-14 bg-white rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.4)] flex items-center justify-center cursor-grab active:cursor-grabbing z-20 group"
      >
        {isLoading ? <Check className="w-6 h-6 text-[#D97706]" /> : <ChevronRight className="w-6 h-6 text-[#D97706] ml-0.5" />}
      </motion.div>
    </div>
  );
};

// 3. InvestSheet
interface InvestSheetProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: Strategy;
  onConfirm: (amount: string, asset: AssetType) => Promise<void>;
  status: 'IDLE' | 'SIGNING' | 'CONFIRMING' | 'SUCCESS' | 'ERROR';
}

const InvestSheet = ({ isOpen, onClose, strategy, onConfirm, status }: InvestSheetProps) => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { showToast } = useToast();
  
  const [amount, setAmount] = useState('0');
  const [asset, setAsset] = useState<AssetType>('SOL');
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!publicKey) return;
    const fetchBalance = async () => {
      if (asset === 'SOL') {
        const bal = await connection.getBalance(publicKey);
        setBalance(bal / LAMPORTS_PER_SOL);
      } else {
        setBalance(0);
      }
    };
    fetchBalance();
  }, [isOpen, asset, publicKey, connection]);

  useEffect(() => {
    if (isOpen) setAmount('0');
  }, [isOpen]);

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

  const handleExecute = () => {
     if (parseFloat(amount) <= 0) {
       showToast("Please enter a valid amount", "error");
       return;
     }
     onConfirm(amount, asset);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-[#0C0A09] rounded-t-[40px] z-50 overflow-hidden flex flex-col safe-area-bottom pb-8 border-t border-white/10 max-h-[85vh]"
          >
            <div className="w-full flex justify-center pt-4 pb-2 cursor-pointer" onClick={onClose}>
              <div className="w-12 h-1.5 bg-[#292524] rounded-full" />
            </div>

            <div className="px-6 pt-2 flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                 <button onClick={onClose} className="p-3 -ml-3 rounded-full hover:bg-white/5 transition-colors">
                   <X className="w-6 h-6 text-[#78716C]" />
                 </button>
                 <div className="flex bg-[#1C1917] rounded-full p-1 border border-white/5">
                    {(['SOL', 'USDC'] as AssetType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setAsset(t)}
                        className={`px-5 py-2 text-xs font-bold rounded-full transition-all ${
                          asset === t ? 'bg-[#D97706] text-black shadow-lg scale-105' : 'text-[#78716C] hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                 </div>
                 <div className="w-6" /> 
              </div>

              <div className="text-center mb-8 flex-1 flex flex-col justify-center">
                 <div className="flex items-baseline justify-center gap-2 mb-3">
                   <span className="text-7xl font-serif font-bold text-white tracking-tighter">
                     {amount}
                   </span>
                   <span className="text-3xl font-bold text-white">
                     {asset}
                   </span>
                 </div>
                 <div className="flex items-center justify-center gap-2 text-sm text-[#78716C] font-mono bg-white/5 py-1.5 px-4 rounded-full mx-auto w-fit">
                   <Wallet className="w-3 h-3" />
                   <span>Available: {balance.toFixed(4)}</span>
                   <button 
                     onClick={() => setAmount((balance * 0.95).toFixed(4))}
                     className="text-[#D97706] font-bold hover:underline ml-1"
                   >
                     MAX
                   </button>
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-x-4 gap-y-2 mb-10 max-w-sm mx-auto w-full">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleNum(key.toString())}
                    className="h-20 text-4xl font-light text-white active:text-[#D97706] active:scale-90 transition-all rounded-2xl flex items-center justify-center hover:bg-white/5"
                    disabled={status !== 'IDLE' && status !== 'ERROR'}
                  >
                    {key}
                  </button>
                ))}
                <button
                  onClick={handleBackspace}
                  className="h-20 text-[#78716C] active:text-red-400 active:scale-90 transition-all rounded-2xl flex items-center justify-center hover:bg-white/5"
                >
                  <ArrowLeft className="w-8 h-8" />
                </button>
              </div>

              <div className="mb-4 max-w-sm mx-auto w-full">
                 <ResponsiveConfirmAction 
                   onConfirm={handleExecute} 
                   isLoading={status === 'SIGNING' || status === 'CONFIRMING'} 
                   label="INVEST"
                 />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// 4. Main View
export const StrategyDetailView = ({ initialData, onBack }: StrategyDetailViewProps) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { scrollY } = useScroll();
  const { showToast } = useToast(); 
  const headerOpacity = useTransform(scrollY, [0, 100], [0, 1]);
  const controls = useAnimation();

  const [strategy, setStrategy] = useState(initialData);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartType, setChartType] = useState<'line' | 'candle'>('line');
  const [timeframe, setTimeframe] = useState('7d');
  
  const [tokensInfo, setTokensInfo] = useState<any[]>([]);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [isInvestOpen, setIsInvestOpen] = useState(false);
  const [investStatus, setInvestStatus] = useState<'IDLE' | 'SIGNING' | 'CONFIRMING' | 'SUCCESS' | 'ERROR'>('IDLE');

  const latestValue = useMemo(() => {
    if (!chartData.length) return strategy.price || 100;
    const last = chartData[chartData.length - 1];
    return typeof last.close === 'number' ? last.close : last.value;
  }, [chartData, strategy.price]);

  const changePct = useMemo(() => {
    if (chartData.length < 2) return 0;
    const start = typeof chartData[0].close === 'number' ? chartData[0].open : chartData[0].value;
    return ((latestValue - start) / start) * 100;
  }, [chartData, latestValue]);

  const isPositive = changePct >= 0;

  useEffect(() => {
    const init = async () => {
      if (wallet.publicKey) {
        try {
          const wRes = await api.checkWatchlist(strategy.id, wallet.publicKey.toBase58());
          setIsWatchlisted(wRes.isWatchlisted);
        } catch {}
      }
      try {
        const tokenRes = await api.getTokens();
        if (tokenRes.success) {
          const enriched = strategy.tokens.map((t: any) => {
            const meta = tokenRes.tokens.find((m: any) => m.symbol === t.symbol.toUpperCase());
            return { ...t, logoURI: meta?.logoURI, name: meta?.name || t.symbol };
          });
          setTokensInfo(enriched);
        } else {
            setTokensInfo(strategy.tokens);
        }
      } catch { setTokensInfo(strategy.tokens); }
    };
    init();
  }, [strategy.id, wallet.publicKey]);

  useEffect(() => {
    const loadChart = async () => {
      try {
        const res = await api.getStrategyChart(strategy.id, timeframe, chartType);
        if (res.success && res.data) setChartData(res.data);
      } catch {}
    };
    loadChart();
  }, [strategy.id, timeframe, chartType]);

  const handleToggleWatchlist = async () => {
    if (!wallet.publicKey) {
        showToast("Connect wallet to track strategies", "info");
        return;
    }
    
    // アニメーション実行
    controls.set({ rotate: 0, scale: 1 }); 
    controls.start({
      rotate: 360,
      scale: [1, 1.5, 1], 
      transition: { type: "spring", stiffness: 300, damping: 12, mass: 0.5 }
    });

    // 楽観的UI更新（APIを待たずに即座に切り替える）
    const nextState = !isWatchlisted;
    setIsWatchlisted(nextState);

    try {
      await api.toggleWatchlist(strategy.id, wallet.publicKey.toBase58());
      showToast(nextState ? "Added to watchlist" : "Removed from watchlist", "success");
    } catch (e) {
      // 失敗したら元に戻す
      setIsWatchlisted(!nextState);
      console.error("Watchlist error:", e);
    }
  };

  const handleCopyCA = () => {
    navigator.clipboard.writeText(strategy.id);
    showToast("Address Copied!", "success");
  };
  
  const handleShareToX = () => {
    const text = `Check out ${strategy.name} ($${strategy.ticker}) on Axis! 🚀`;
    // window.location.href は現在のURL
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  
  const handleDeposit = async (amountStr: string, asset: AssetType) => {
    if (!wallet.publicKey) {
      showToast("Please connect your wallet first", "error");
      return;
    }
    
    if (asset === 'USDC') {
      showToast("USDC deposits are coming soon! Switched to SOL.", "info");
      return; 
    }

    setInvestStatus('SIGNING');
    
    try {
      const parsedAmount = parseFloat(amountStr);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw new Error("Invalid amount");
      }

      // -------------------------------------------------------
      // ★ 修正ポイント: アドレス解決ロジックの強化
      // -------------------------------------------------------
      
      // 1. 優先順位に従ってアドレス候補を取得
      const targetAddressStr = 
          strategy.address || 
          strategy.config?.strategyPubkey || 
          (strategy.id && strategy.id.length < 50 && !strategy.id.includes('-') ? strategy.id : null);

      console.log("Found Address Candidate:", targetAddressStr);

      // 2. 候補がない、またはUUID（ハイフンが含まれる）場合はエラーにする
      // UUID: 0ddd8d53-c18e-4d5d-b72e-046df12d6dd9 (36文字, ハイフンあり)
      if (!targetAddressStr || targetAddressStr.includes('-')) {
          console.error("Critical: No valid Solana address found. ID is UUID:", strategy.id);
          
          // ★ここで強制的にユーザーに通知して処理を中断する
          showToast("Error: Strategy address not found in database.", "error");
          setInvestStatus('ERROR');
          setTimeout(() => setInvestStatus('IDLE'), 2000);
          return; 
      }

      // 3. ここまで来れば Solanaアドレス とみなしてPublicKey化
      let targetPubkey: PublicKey;
      try {
        targetPubkey = new PublicKey(targetAddressStr.trim());
      } catch (e) {
        throw new Error(`Invalid address format: ${targetAddressStr}`);
      }

      console.log(`Depositing ${parsedAmount} SOL to ${targetPubkey.toBase58()}`);

      // 4. 入金実行
      const signature = await KagemushaService.depositSol(
          connection, 
          wallet, 
          targetPubkey, 
          parsedAmount
      );
      
      console.log("Deposit Success, Signature:", signature);
      showToast(`Successfully deposited ${parsedAmount} SOL`, "success");
      setInvestStatus('SUCCESS');
      
      try {
        await api.syncUserStats(wallet.publicKey.toBase58(), 0, parsedAmount);
      } catch (syncError) {
        console.warn("Failed to sync stats:", syncError);
      }

      setTimeout(() => { 
        setIsInvestOpen(false); 
        setInvestStatus('IDLE'); 
      }, 1500);

    } catch (e: any) {
      console.error("Deposit Transaction Failed:", e);
      if (e.logs) console.error("Simulation Logs:", e.logs);

      let msg = "Transaction Failed";
      if (e.message.includes("User rejected")) msg = "Transaction cancelled";
      
      showToast(msg, "error");
      setInvestStatus('ERROR');
      setTimeout(() => setInvestStatus('IDLE'), 2000);
    }
  };


  return (
    <div className="min-h-screen bg-black text-[#E7E5E4] pb-40 font-sans selection:bg-[#D97706]/30 max-w-2xl mx-auto">
      
      {/* 1. Navbar */}
      <motion.div className="fixed top-0 inset-x-0 h-16 bg-black/80 backdrop-blur-xl z-40 flex items-center justify-between px-6 border-b border-white/5 safe-area-top max-w-2xl mx-auto">
        <button onClick={onBack} className="p-3 -ml-3 text-white/70 hover:text-white active:scale-90 transition-transform">
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <motion.div style={{ opacity: headerOpacity }} className="font-bold font-serif text-sm tracking-wider text-center pointer-events-none">
          {strategy.ticker || 'STRATEGY'}
          <div className={`text-[10px] ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>${latestValue.toFixed(2)}</div>
        </motion.div>

        <div className="flex gap-2">
          <button onClick={handleToggleWatchlist} className="p-2 text-white/70 hover:text-yellow-400">
            <motion.div animate={controls}>
              <Star className={`w-5 h-5 ${isWatchlisted ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </motion.div>
          </button>
          <button onClick={handleShareToX} className="p-2 text-white/70 hover:text-white">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </svg>
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="pt-32 md:pt-44 px-8 md:px-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Info */}
        <div className="mb-10">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight font-serif mb-2 md:mb-4">
            {strategy.name}
          </h1>
           <div className="flex items-baseline gap-4">
           <span className="text-4xl md:text-7xl font-serif font-bold tracking-tighter text-white">
              ${latestValue.toFixed(2)}
            </span>
            <div className={`flex items-center gap-1.5 px-3 py-1 md:px-4 md:py-2 rounded-full text-sm md:text-base font-bold ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
               {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
               {Math.abs(changePct).toFixed(2)}%
             </div>
           </div>
           
           <button onClick={handleCopyCA} className="mt-5 flex items-center gap-2.5 px-4 py-2 bg-[#1C1917] hover:bg-[#292524] rounded-full border border-white/10 active:scale-95 transition-all w-fit group">
             <span className="text-xs text-[#78716C] font-serif group-hover:text-white">Address:</span>
             <span className="text-sm font-mono text-[#A8A29E] group-hover:text-white">{strategy.id.slice(0, 6)}...{strategy.id.slice(-6)}</span>
             <Copy className="w-4 h-4 text-[#57534E] group-hover:text-white" />
           </button>
        </div>

        {/* Chart */}
        <div className="mb-12 relative bg-[#1C1917]/30 rounded-3xl p-4 border border-white/5">
          <RichChart data={chartData} isPositive={isPositive} />
          <div className="flex justify-between px-4 mt-6 border-t border-white/5 pt-4">
            {['1D', '1W', '1M', 'ALL'].map(tf => (
              <button 
                key={tf} 
                onClick={() => setTimeframe(tf === '1W' ? '7d' : tf === 'ALL' ? '30d' : tf.toLowerCase())} 
                className={`text-xs font-bold py-1.5 px-5 rounded-full transition-all border ${ (timeframe === '7d' && tf === '1W') || timeframe === tf.toLowerCase() ? 'bg-[#E7E5E4] text-black border-[#E7E5E4]' : 'text-[#78716C] border-transparent hover:text-white'}`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-12">
        <div className="p-6 md:p-8 bg-[#1C1917] rounded-3xl border border-white/5 flex flex-col justify-between h-32 md:h-40 hover:border-[#D97706]/30 transition-colors">
          <div className="flex items-center gap-2 text-[#78716C]">
            <Layers className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-[10px] md:text-xs uppercase font-bold tracking-widest">TVL</span>
          </div>
          <p className="text-2xl md:text-4xl font-serif font-bold text-white">
                {typeof strategy.tvl === 'number' ? strategy.tvl.toLocaleString() : '0'} <span className="text-sm text-[#57534E]">SOL</span>
             </p>
           </div>
           <div className="p-5 bg-[#1C1917] rounded-3xl border border-white/5 flex flex-col justify-between h-28 hover:border-[#D97706]/30 transition-colors">
             <div className="flex items-center gap-2 text-[#78716C]">
               <Activity className="w-4 h-4" />
               <span className="text-xs uppercase font-bold tracking-widest">ROI</span>
             </div>
             <p className={`text-2xl font-serif font-bold ${changePct >= 0 ? 'text-[#D97706]' : 'text-red-500'}`}>
                {changePct > 0 ? '+' : ''}{changePct.toFixed(2)}%
             </p>
           </div>
        </div>

        {/* Holdings List */}
        <div className="mb-20">
          <h3 className="text-xl font-bold font-serif mb-6 flex items-center gap-3 text-[#E7E5E4]">
            <PieChart className="w-6 h-6 text-[#D97706]" /> Composition
          </h3>
          <div className="space-y-4">
            {tokensInfo.length > 0 ? tokensInfo.map((token, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.05 }} 
                className="flex items-center justify-between p-5 bg-[#1C1917] hover:bg-[#292524] rounded-3xl border border-white/5 transition-all hover:translate-x-1"
              >
                <div className="flex items-center gap-5">
                  <div className="relative">
                    {token.logoURI ? <img src={token.logoURI} alt={token.symbol} className="w-12 h-12 rounded-full bg-black object-cover shadow-lg" /> : <div className="w-12 h-12 rounded-full bg-[#292524] flex items-center justify-center font-bold text-sm text-[#D97706] border border-[#D97706]/20">{token.symbol[0]}</div>}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black flex items-center justify-center border border-white/10 shadow-md">
                       <img src="https://assets.coingecko.com/coins/images/4128/small/solana.png" className="w-3.5 h-3.5" alt="SOL" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-white">{token.symbol}</h4>
                    <p className="text-xs text-[#78716C]">{token.name || 'Unknown'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-serif font-bold text-[#D97706] text-xl">{token.weight}%</p>
                  <p className="text-[10px] text-[#57534E] uppercase tracking-widest">Allocation</p>
                </div>
              </motion.div>
            )) : <div className="text-center py-20 text-[#57534E]"><Sparkles className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="font-serif">Loading composition...</p></div>}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black via-black/95 to-transparent z-40 safe-area-bottom max-w-2xl mx-auto">
        <div className="flex gap-4">
             <div className="flex-1 bg-[#1C1917] rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
                <span className="text-[10px] text-[#78716C] uppercase tracking-widest mb-1">My Position</span>
                <span className="font-serif font-bold text-[#E7E5E4] text-lg">$0.00</span>
             </div>
            <button 
              onClick={() => setIsInvestOpen(true)} 
              className="flex-[2] py-4 bg-gradient-to-r from-[#D97706] to-[#B45309] text-black font-bold text-xl rounded-2xl shadow-[0_0_30px_rgba(217,119,6,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 hover:brightness-110"
            >
              Invest <ChevronRight className="w-6 h-6 opacity-70" />
            </button>
        </div>
      </div>

      {/* Invest Modal */}
      <InvestSheet isOpen={isInvestOpen} onClose={() => setIsInvestOpen(false)} strategy={strategy} onConfirm={handleDeposit} status={investStatus} />
    </div>
  );
};