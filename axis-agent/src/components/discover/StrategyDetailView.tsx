import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useAnimation, useTransform as useMotionTransform } from 'framer-motion';
import { 
  ArrowLeft, Copy, Star, 
  TrendingUp, TrendingDown, Layers, Activity, ChevronRight, PieChart, Wallet, ArrowRight, X, Check
} from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';

import { RichChart } from '../common/RichChart';
import { api } from '../../services/api';
import type { Strategy } from '../../types';
import { useToast } from '../../context/ToastContext';

// --- Types ---
interface StrategyDetailViewProps {
  initialData: Strategy;
  onBack: () => void;
}
type AssetType = 'SOL' | 'USDC';

// --- Icons ---
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
  </svg>
);

// --- Components (UI Parts) ---

// 1. Swipe To Confirm
const SwipeToConfirm = ({ 
  onConfirm, 
  isLoading, 
  isSuccess, 
  label 
}: { 
  onConfirm: () => void; 
  isLoading: boolean; 
  isSuccess?: boolean;
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

  useEffect(() => {
    if (!constraintsRef.current) return;
    const el = constraintsRef.current;
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (isLoading || isSuccess) {
      x.set(maxDrag);
    } else {
      x.set(0);
    }
  }, [isLoading, isSuccess, maxDrag, x]);

  const handleDragEnd = () => {
    const current = x.get();
    const threshold = maxDrag * 0.58; 
    if (current > threshold) {
      x.set(maxDrag);
      if (!isLoading && !isSuccess) onConfirm();
    } else {
      x.set(0);
    }
  };

  return (
    <div
      ref={constraintsRef}
      className={`relative h-14 w-full rounded-full overflow-hidden border select-none shadow-inner p-1 box-border transition-colors duration-300 ${isSuccess ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-[#1C1917] border-white/10'}`}
    >
      <motion.div
        className={`absolute inset-y-0 left-0 rounded-full z-0 ${isSuccess ? 'bg-emerald-500' : 'bg-[#D97706]'}`}
        style={{ width: progressWidth, opacity: (isLoading || isSuccess) ? 1 : progressOpacity }}
      />
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        style={{ opacity: textOpacity }}
      >
        <span className={`font-bold text-xs tracking-[0.2em] transition-colors duration-300 ${isLoading || isSuccess ? "text-white" : "text-white/40"}`}>
          {isLoading ? "PROCESSING..." : isSuccess ? "COMPLETED" : `SLIDE TO ${label}`}
        </span>
      </motion.div>
      <motion.div
        drag={(!isLoading && !isSuccess) ? "x" : false}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.02}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x, touchAction: "pan-x" }}
        className="relative w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing z-20"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-[#D97706] border-t-transparent rounded-full animate-spin" />
        ) : isSuccess ? (
          <Check className="w-6 h-6 text-emerald-600" />
        ) : (
          <ChevronRight className="w-5 h-5 text-[#D97706] ml-0.5" />
        )}
      </motion.div>
    </div>
  );
};

// 2. InvestSheet
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
        try {
          const bal = await connection.getBalance(publicKey);
          setBalance(bal / LAMPORTS_PER_SOL);
        } catch (e) {
          console.error("Failed to fetch balance", e);
        }
      } else {
        setBalance(0);
      }
    };
    if (isOpen) fetchBalance();
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
     const val = parseFloat(amount);
     if (isNaN(val) || val <= 0) {
       showToast("Enter valid amount", "error");
       return;
     }
     onConfirm(amount, asset);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
            onClick={status === 'IDLE' || status === 'ERROR' || status === 'SUCCESS' ? onClose : undefined}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-[#0C0A09] rounded-t-[32px] z-[70] overflow-hidden flex flex-col safe-area-bottom border-t border-white/10"
            style={{ maxHeight: '90vh' }}
          >
            <div className="w-full flex justify-center pt-3 pb-1" onClick={status === 'IDLE' ? onClose : undefined}>
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            <div className="px-6 pt-2 pb-8 flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                 <button 
                   onClick={onClose} 
                   disabled={status === 'SIGNING' || status === 'CONFIRMING'}
                   className="p-2 -ml-2 rounded-full text-[#78716C] hover:text-white transition-colors disabled:opacity-30"
                 >
                   <X className="w-5 h-5" />
                 </button>
                 <div className="flex bg-[#1C1917] rounded-full p-0.5 border border-white/10">
                    {(['SOL', 'USDC'] as AssetType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setAsset(t)}
                        disabled={status !== 'IDLE' && status !== 'ERROR'}
                        className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${
                          asset === t ? 'bg-[#D97706] text-black shadow-md' : 'text-[#78716C] hover:text-white disabled:opacity-50'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                 </div>
                 <div className="w-5" /> 
              </div>

              <div className="flex-1 flex flex-col justify-center items-center mb-6">
                 <div className="flex items-end justify-center gap-1 mb-2">
                   <span className="text-5xl font-serif font-bold text-white tracking-tight">
                     {amount}
                   </span>
                   <span className="text-xl font-bold text-[#78716C] mb-1.5">
                     {asset}
                   </span>
                 </div>
                 <div className="flex items-center gap-2 text-xs text-[#78716C] font-mono bg-white/5 py-1 px-3 rounded-full">
                   <Wallet className="w-3 h-3" />
                   <span>{balance.toFixed(4)} Available</span>
                   <button 
                     onClick={() => setAmount((balance * 0.95).toFixed(4))}
                     className="text-[#D97706] font-bold disabled:opacity-50"
                     disabled={status !== 'IDLE' && status !== 'ERROR'}
                   >
                     MAX
                   </button>
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-x-2 gap-y-2 mb-8 max-w-xs mx-auto w-full">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleNum(key.toString())}
                    className="h-14 text-2xl font-light text-white active:bg-white/10 rounded-xl transition-colors flex items-center justify-center disabled:opacity-30"
                    disabled={status !== 'IDLE' && status !== 'ERROR'}
                  >
                    {key}
                  </button>
                ))}
                <button
                  onClick={handleBackspace}
                  className="h-14 text-[#78716C] active:text-white active:bg-white/10 rounded-xl transition-colors flex items-center justify-center disabled:opacity-30"
                  disabled={status !== 'IDLE' && status !== 'ERROR'}
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              </div>

              <div className="max-w-xs mx-auto w-full">
                 <SwipeToConfirm 
                   onConfirm={handleExecute} 
                   isLoading={status === 'SIGNING' || status === 'CONFIRMING'} 
                   isSuccess={status === 'SUCCESS'}
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
  
  const headerOpacity = useTransform(scrollY, [0, 60], [0, 1]);
  const headerY = useTransform(scrollY, [0, 60], [-10, 0]);

  const [strategy, setStrategy] = useState(initialData);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartType, setChartType] = useState<'line' | 'candle'>('line');
  const [timeframe, setTimeframe] = useState('7d');
  
  const [tokensInfo, setTokensInfo] = useState<any[]>([]);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [isInvestOpen, setIsInvestOpen] = useState(false);
  const [investStatus, setInvestStatus] = useState<'IDLE' | 'SIGNING' | 'CONFIRMING' | 'SUCCESS' | 'ERROR'>('IDLE');

  const controls = useAnimation();

  // --- Logic (Safety First) ---
  const latestValue = useMemo(() => {
    const data = chartData || [];
    if (data.length === 0) return strategy.price || 100;
    const last = data[data.length - 1];
    return typeof last.close === 'number' ? last.close : last.value;
  }, [chartData, strategy.price]);

  const changePct = useMemo(() => {
    const data = chartData || [];
    if (data.length < 2) return 0;
    const start = typeof data[0].close === 'number' ? data[0].open : data[0].value;
    return ((latestValue - start) / (start || 1)) * 100;
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
          // strategy.tokens が undefined の場合に備えてデフォルト空配列
          const enriched = (strategy.tokens || []).map((t: any) => {
            const meta = (tokenRes.tokens || []).find((m: any) => m.symbol === t.symbol?.toUpperCase());
            return { ...t, logoURI: meta?.logoURI, name: meta?.name || t.symbol };
          });
          setTokensInfo(enriched);
        } else {
            setTokensInfo(strategy.tokens || []);
        }
      } catch { setTokensInfo(strategy.tokens || []); }
    };
    init();
  }, [strategy.id, wallet.publicKey, strategy.tokens]);

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
        showToast("Connect wallet required", "info");
        return;
    }
    controls.set({ rotate: 0, scale: 1 }); 
    controls.start({
      rotate: 360,
      scale: [1, 1.3, 1], 
      transition: { type: "spring", stiffness: 300, damping: 12 }
    });
    const nextState = !isWatchlisted;
    setIsWatchlisted(nextState);
    try {
      await api.toggleWatchlist(strategy.id, wallet.publicKey.toBase58());
      showToast(nextState ? "Watched" : "Unwatched", "success");
    } catch (e: any) {
      setIsWatchlisted(!nextState);
      showToast("Failed to update", "error");
    }
  };

  const handleCopyCA = () => {
    navigator.clipboard.writeText(strategy.id);
    showToast("Address Copied", "success");
  };
  
  const handleShareToX = () => {
    const text = `Check out ${strategy.name} ($${strategy.ticker}) on Axis! 🚀`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  const handleDeposit = async (amountStr: string, asset: AssetType) => {
    if (!wallet.publicKey) {
      showToast("Connect Wallet", "error");
      return;
    }
    if (asset === 'USDC') {
      showToast("USDC coming soon", "info");
      return; 
    }
    setInvestStatus('SIGNING');
    try {
      const parsedAmount = parseFloat(amountStr);
      if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error("Invalid amount");

      const strategyAny = strategy as any;
      const targetAddressStr = strategy.address || strategy.config?.strategyPubkey || strategy.ownerPubkey || strategyAny.ownerPubkey || strategyAny.creator || strategy.owner || null;

      if (!targetAddressStr) {
          showToast("Address not found", "error");
          setInvestStatus('ERROR');
          setTimeout(() => setInvestStatus('IDLE'), 2000);
          return;
      }

      const targetPubkey = new PublicKey(targetAddressStr.trim());
      const lamports = Math.floor(parsedAmount * LAMPORTS_PER_SOL);
      const transaction = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: targetPubkey, lamports })
      );

      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = wallet.publicKey;

      if (!wallet.signTransaction) {
        throw new Error("Wallet does not support signing");
      }

      const signedTx = await wallet.signTransaction(transaction);
      
      setInvestStatus('CONFIRMING');
      const signature = await connection.sendRawTransaction(signedTx.serialize());

      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });

      showToast(`Deposited ${parsedAmount} SOL`, "success");
      setInvestStatus('SUCCESS');

      setTimeout(() => {
        setIsInvestOpen(false);
        setTimeout(() => setInvestStatus('IDLE'), 500);
      }, 1500);

      void api.syncUserStats(wallet.publicKey.toBase58(), 0, parsedAmount, strategy.id).catch(console.error);

    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Transaction Failed", "error");
      setInvestStatus('ERROR');
      setTimeout(() => setInvestStatus('IDLE'), 2000);
    }
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-black text-[#E7E5E4] pb-32 font-sans selection:bg-[#D97706]/30">
      
      {/* 1. Immersive Header */}
      <motion.div 
        className="fixed top-0 inset-x-0 z-[100] flex items-center justify-between px-4 py-3 safe-area-top pointer-events-none"
      >
        <motion.div className="absolute inset-0 bg-black/80 backdrop-blur-md border-b border-white/5 pointer-events-auto" style={{ opacity: headerOpacity }} />
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }} 
          className="relative z-50 w-10 h-10 flex items-center justify-center text-white/90 hover:text-white bg-black/40 rounded-full backdrop-blur-md transition-all active:scale-90 pointer-events-auto shadow-sm border border-white/5 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <motion.div style={{ opacity: headerOpacity, y: headerY }} className="relative z-10 font-bold text-sm tracking-wide pointer-events-none">
          {strategy?.ticker}
        </motion.div>

        <div className="relative z-10 flex gap-2 pointer-events-auto">
          <button onClick={handleToggleWatchlist} className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-yellow-400 bg-black/40 rounded-full backdrop-blur-md border border-white/5 active:scale-95 transition-all">
            <motion.div animate={controls}>
              <Star className={`w-5 h-5 ${isWatchlisted ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </motion.div>
          </button>
          
          <button onClick={handleShareToX} className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white bg-black/40 rounded-full backdrop-blur-md border border-white/5 active:scale-95 transition-all">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* 2. Hero Section */}
      <div className="pt-24 px-0 relative">
        <div className="px-6 mb-6">
          <div className="flex flex-col items-start">
             <h1 className="text-xl font-bold text-[#78716C] mb-1">{strategy?.name}</h1>
             <div className="flex items-baseline gap-3">
               <span className="text-5xl font-serif font-bold tracking-tighter text-white">
                 ${latestValue?.toFixed(2)}
               </span>
             </div>
             <div className={`flex items-center gap-1 mt-2 text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
               {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
               {Math.abs(changePct).toFixed(2)}% <span className="text-[#57534E] font-normal ml-1">Today</span>
             </div>
          </div>
        </div>

        <div className="w-full h-[280px] mb-4">
          <RichChart data={chartData || []} isPositive={isPositive} />
        </div>

        <div className="flex justify-center mb-8 px-6">
          <div className="flex bg-[#1C1917] p-1 rounded-xl border border-white/5">
            {['1D', '1W', '1M', 'ALL'].map(tf => (
              <button 
                key={tf} 
                onClick={() => setTimeframe(tf === '1W' ? '7d' : tf === 'ALL' ? '30d' : tf.toLowerCase())} 
                className={`text-[10px] font-bold py-1.5 px-4 rounded-lg transition-all ${ 
                  (timeframe === '7d' && tf === '1W') || timeframe === tf.toLowerCase() 
                  ? 'bg-[#3E3A36] text-white shadow-sm' 
                  : 'text-[#78716C] hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Stats Strip */}
      <div className="px-6 mb-8">
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
           <div className="flex-shrink-0 min-w-[140px] p-4 bg-[#1C1917] rounded-2xl border border-white/5 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[#78716C]">
                <Layers className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">TVL</span>
              </div>
              <p className="text-lg font-bold text-white">
                {typeof strategy?.tvl === 'number' ? (strategy.tvl >= 1000 ? `${(strategy.tvl/1000).toFixed(1)}k` : strategy.tvl.toFixed(0)) : '0'} <span className="text-xs font-normal text-[#57534E]">SOL</span>
              </p>
           </div>

           <div className="flex-shrink-0 min-w-[140px] p-4 bg-[#1C1917] rounded-2xl border border-white/5 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[#78716C]">
                <Activity className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">ROI (All)</span>
              </div>
              <p className={`text-lg font-bold ${changePct >= 0 ? 'text-[#D97706]' : 'text-red-500'}`}>
                {changePct > 0 ? '+' : ''}{changePct?.toFixed(2)}%
              </p>
           </div>

           <button onClick={handleCopyCA} className="flex-shrink-0 min-w-[140px] p-4 bg-[#1C1917] rounded-2xl border border-white/5 flex flex-col gap-1 hover:bg-[#292524] transition-colors text-left group">
              <div className="flex items-center gap-1.5 text-[#78716C]">
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Contract</span>
              </div>
              <p className="text-sm font-mono text-[#A8A29E] truncate w-full group-hover:text-white">
                 {strategy?.id ? `${strategy.id.slice(0, 4)}...${strategy.id.slice(-4)}` : 'N/A'}
              </p>
           </button>
        </div>
      </div>

      {/* 4. Composition List */}
      <div className="px-6">
        <h3 className="text-sm font-bold text-[#78716C] uppercase tracking-widest mb-4 flex items-center gap-2">
          <PieChart className="w-4 h-4" /> Composition
        </h3>
        
        <div className="bg-[#1C1917]/50 rounded-3xl border border-white/5 overflow-hidden">
          {(tokensInfo?.length ?? 0) > 0 ? tokensInfo.map((token, i) => (
            <div
              key={i}
              className={`relative p-4 ${i !== tokensInfo.length - 1 ? 'border-b border-white/5' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    {token.logoURI ? (
                      <img src={token.logoURI} alt={token.symbol} className="w-10 h-10 rounded-full bg-black object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#292524] flex items-center justify-center font-bold text-xs text-[#D97706]">{token.symbol?.[0] || '?'}</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-sm">{token.symbol || 'UNK'}</h4>
                    <p className="text-[10px] text-[#78716C] truncate">{token.name || 'Token'}</p>
                  </div>
                </div>
                <span className="font-bold text-white text-sm shrink-0 ml-2">{token.weight}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${token.weight}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full bg-[#D97706] rounded-full"
                  />
              </div>
            </div>
          )) : (
            <div className="text-center py-8 text-[#57534E] text-sm">Loading composition...</div>
          )}
        </div>
      </div>

      {/* 5. Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-[#0C0A09]/95 backdrop-blur-md border-t border-white/10 z-40 pt-3 px-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 8px)' }}>
        <div className="flex items-center justify-between gap-4">
           <div className="flex flex-col">
              <span className="text-[10px] text-[#78716C] uppercase tracking-wider">Your Position</span>
              <span className="text-lg font-serif font-bold text-white">$0.00</span>
           </div>
           
           <button 
             onClick={() => setIsInvestOpen(true)} 
             className="bg-[#D97706] text-black font-bold px-8 py-3 rounded-full shadow-[0_4px_20px_rgba(217,119,6,0.3)] active:scale-95 transition-all flex items-center gap-2"
           >
             Invest <ArrowRight className="w-4 h-4" />
           </button>
        </div>
      </div>

      <InvestSheet isOpen={isInvestOpen} onClose={() => setIsInvestOpen(false)} strategy={strategy} onConfirm={handleDeposit} status={investStatus} />
    </div>
  );
};