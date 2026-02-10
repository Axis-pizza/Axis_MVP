import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useTransform as useMotionTransform, useAnimation } from 'framer-motion';
import { 
  ArrowLeft, Copy, Star, 
  TrendingUp, TrendingDown, Layers, Activity, PieChart, Wallet, ArrowRight, X, Check, ArrowDown, Loader2, ChevronRight
} from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction, 
  getAccount, 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import { RichChart } from '../common/RichChart';
import { api } from '../../services/api';
import type { Strategy } from '../../types';
import { useToast } from '../../context/ToastContext';

const MASTER_MINT_ADDRESS = new PublicKey("2JiisncKr8DhvA68MpszFDjGAVu2oFtqJJC837LLiKdT");


// --- Types ---
interface StrategyDetailViewProps {
  initialData: Strategy;
  onBack: () => void;
}
type TransactionStatus = 'IDLE' | 'SIGNING' | 'CONFIRMING' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

// --- Icons ---
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
  </svg>
);

// --- Components (UI Parts) ---

// 1. Swipe To Confirm (Pump Style)
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

  const textOpacity = useMotionTransform(x, [0, maxDrag * 0.5], [1, 0]);
  const progressWidth = useMotionTransform(x, [0, maxDrag], [HANDLE_SIZE + PADDING * 2, containerWidth]);

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
    if (x.get() > maxDrag * 0.6) {
      x.set(maxDrag);
      if (!isLoading && !isSuccess) onConfirm();
    } else {
      x.set(0);
    }
  };

  return (
    <div
      ref={constraintsRef}
      className={`relative h-16 w-full rounded-full overflow-hidden border select-none transition-all duration-300 ${
        isSuccess 
          ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
          : 'bg-[#1C1917] border-white/10 shadow-inner'
      }`}
    >
      <motion.div
        className={`absolute inset-y-0 left-0 rounded-full z-0 ${
          isSuccess ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#D97706] to-[#F59E0B]'
        }`}
        style={{ width: progressWidth }}
      />
      
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        style={{ opacity: textOpacity }}
      >
        <span className="font-bold text-xs tracking-[0.2em] text-white/50 animate-pulse">
          {isLoading ? "PROCESSING..." : `SLIDE TO ${label}`}
        </span>
      </motion.div>

      {isSuccess && (
        <div className="absolute inset-0 flex items-center justify-center z-20 text-white font-bold tracking-widest text-sm">
          SUCCESS
        </div>
      )}

      <motion.div
        drag={(!isLoading && !isSuccess) ? "x" : false}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.05}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x, touchAction: "pan-x" }}
        className="relative top-1 left-1 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing z-30"
      >
        {isLoading ? (
          <Loader2 className="w-6 h-6 text-[#D97706] animate-spin" />
        ) : isSuccess ? (
          <Check className="w-6 h-6 text-emerald-600" />
        ) : (
          <ChevronRight className="w-6 h-6 text-[#D97706]" />
        )}
      </motion.div>
    </div>
  );
};
interface InvestSheetProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: Strategy;
  // モード(buy/sell)と金額を親に渡すように変更
  onConfirm: (amount: string, mode: 'BUY' | 'SELL') => Promise<void>; 
  status: TransactionStatus;
  userEtfBalance: number; // ユーザーのETF保有量を受け取る
}

const InvestSheet = ({ isOpen, onClose, strategy, onConfirm, status, userEtfBalance }: InvestSheetProps) => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { showToast } = useToast();
  
  const [mode, setMode] = useState<'BUY' | 'SELL'>('BUY'); // タブ状態管理
  const [amount, setAmount] = useState('0');
  const [solBalance, setSolBalance] = useState(0);

  // 仮のレート (バックエンドと合わせる必要あり)
  const MOCK_PRICE_PER_TOKEN = 0.01; // 1 Token = 0.01 SOL

  useEffect(() => {
    if (!publicKey || !isOpen) return;
    const fetchBalance = async () => {
      try {
        const bal = await connection.getBalance(publicKey);
        setSolBalance(bal / LAMPORTS_PER_SOL);
      } catch (e) {
        console.error("Failed to fetch balance", e);
      }
    };
    fetchBalance();
  }, [isOpen, publicKey, connection]);

  useEffect(() => {
    if (isOpen) {
        setAmount('0');
        setMode('BUY'); // デフォルトはBuy
    }
  }, [isOpen]);

  // 入力値に基づいた見積もり計算
  const estimatedOutput = useMemo(() => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return '0.00';
    
    if (mode === 'BUY') {
        // SOL -> ETF (SOL / Price)
        return (val / MOCK_PRICE_PER_TOKEN).toFixed(2);
    } else {
        // ETF -> SOL (ETF * Price)
        return (val * MOCK_PRICE_PER_TOKEN).toFixed(4);
    }
  }, [amount, mode]);

  const currentBalance = mode === 'BUY' ? solBalance : userEtfBalance;
  const ticker = strategy.ticker || 'ETF';

  const handleNum = (num: string) => {
    if (status !== 'IDLE' && status !== 'ERROR') return;
    if (amount === '0' && num !== '.') setAmount(num);
    else if (amount.includes('.') && num === '.') return;
    else if (amount.length < 9) setAmount(prev => prev + num);
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
     if (val > currentBalance) {
        showToast("Insufficient balance", "error");
        return;
     }
     onConfirm(amount, mode);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
            onClick={status === 'IDLE' || status === 'ERROR' || status === 'SUCCESS' ? onClose : undefined}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-[#0C0A09] rounded-t-[32px] z-[70] overflow-hidden flex flex-col safe-area-bottom border-t border-white/10 shadow-2xl"
            style={{ maxHeight: '92vh' }}
          >
            {/* Header */}
            <div className="w-full flex justify-center pt-4 pb-2" onClick={status === 'IDLE' ? onClose : undefined}>
              <div className="w-12 h-1.5 bg-white/10 rounded-full" />
            </div>

            <div className="px-6 pt-2 pb-8 flex flex-col h-full">
              {/* Buy/Sell Tabs */}
              <div className="flex justify-center mb-6">
                  <div className="flex bg-white/5 p-1 rounded-full border border-white/5">
                      <button
                          onClick={() => setMode('BUY')}
                          disabled={status !== 'IDLE' && status !== 'ERROR'}
                          className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                              mode === 'BUY' ? 'bg-emerald-500 text-white shadow-lg' : 'text-[#78716C] hover:text-white'
                          }`}
                      >
                          BUY
                      </button>
                      <button
                          onClick={() => setMode('SELL')}
                          disabled={status !== 'IDLE' && status !== 'ERROR'}
                          className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                              mode === 'SELL' ? 'bg-red-500 text-white shadow-lg' : 'text-[#78716C] hover:text-white'
                          }`}
                      >
                          SELL
                      </button>
                  </div>
              </div>

              {/* Main Display */}
              <div className="flex-1 flex flex-col justify-center items-center mb-8 relative">
                 {status !== 'IDLE' && status !== 'ERROR' ? (
                   /* Transaction Status UI (Keep existing logic) */
                   <div className="flex flex-col items-center gap-6 py-4">
                     {/* ... (Existing Step Indicator code) ... */}
                     <div className="text-center">
                        <p className="text-sm font-bold text-white mb-1">Processing Transaction...</p>
                        <p className="text-xs text-[#78716C]">{mode === 'BUY' ? 'Sending SOL...' : `Sending ${ticker}...`}</p>
                     </div>
                     <Loader2 className="w-12 h-12 text-[#D97706] animate-spin" />
                   </div>
                 ) : (
                   /* Input UI */
                   <>
                     <div className="flex flex-col items-center z-10">
                       <div className="flex items-baseline justify-center gap-2 mb-1">
                         <span className={`font-serif font-bold text-white tracking-tighter text-6xl ${amount === '0' ? 'opacity-50' : ''}`}>
                           {amount}
                         </span>
                         <span className={`text-xl font-bold ${mode === 'BUY' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {mode === 'BUY' ? 'SOL' : ticker}
                         </span>
                       </div>
                       
                       {/* Balance Display */}
                       <div className="flex items-center gap-2 text-xs text-[#78716C] font-mono bg-white/5 py-1.5 px-3 rounded-full border border-white/5">
                          <Wallet className="w-3 h-3" />
                          <span>{currentBalance.toFixed(4)} Available</span>
                          <button
                            onClick={() => setAmount((currentBalance * (mode === 'BUY' ? 0.95 : 1)).toFixed(4))}
                            className="text-[#D97706] font-bold hover:text-[#fbbf24]"
                          >
                            MAX
                          </button>
                       </div>
                     </div>

                     <div className="my-6 text-white/20">
                        <ArrowDown className="w-6 h-6" />
                     </div>

                     <div className="flex flex-col items-center">
                        <div className="text-sm font-bold text-[#78716C] uppercase mb-1">You Receive (Est.)</div>
                        <div className="flex items-center gap-2 text-3xl font-bold text-white">
                           <span>{estimatedOutput}</span>
                           <span className={mode === 'BUY' ? 'text-[#D97706]' : 'text-emerald-500'}>
                               {mode === 'BUY' ? ticker : 'SOL'}
                           </span>
                        </div>
                     </div>
                   </>
                 )}
              </div>

              {/* Numpad (Existing code) */}
              {(status === 'IDLE' || status === 'ERROR') && (
                <div className="grid grid-cols-3 gap-3 mb-8 max-w-[280px] mx-auto w-full">
                  {/* ... Existing Numpad Buttons ... */}
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((key) => (
                    <button
                      key={key}
                      onClick={() => handleNum(key.toString())}
                      className="h-14 text-2xl font-medium text-white/90 hover:bg-white/5 active:bg-white/10 rounded-2xl transition-all flex items-center justify-center"
                    >
                      {key}
                    </button>
                  ))}
                  <button onClick={handleBackspace} className="h-14 flex items-center justify-center text-[#78716C] hover:bg-white/5 rounded-2xl"><ArrowLeft /></button>
                </div>
              )}

              {/* Swipe to Confirm */}
              <div className="max-w-[320px] mx-auto w-full">
                 <SwipeToConfirm
                   onConfirm={handleExecute}
                   isLoading={status !== 'IDLE' && status !== 'ERROR' && status !== 'SUCCESS'}
                   isSuccess={status === 'SUCCESS'}
                   label={`${mode} ${ticker}`}
                 />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// 3. Main View
export const StrategyDetailView = ({ initialData, onBack }: StrategyDetailViewProps) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { showToast } = useToast(); 
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollContainerRef });
  const headerOpacity = useTransform(scrollY, [0, 60], [0, 1]);
  const headerY = useTransform(scrollY, [0, 60], [-10, 0]);

  const [strategy] = useState(initialData);
  const [chartData, setChartData] = useState<any[]>([]);
  const [timeframe] = useState('7d');
  
  const [tokensInfo, setTokensInfo] = useState<any[]>([]);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [isInvestOpen, setIsInvestOpen] = useState(false);
  const [investStatus, setInvestStatus] = useState<TransactionStatus>('IDLE');
  const [userEtfBalance, setUserEtfBalance] = useState(0);

  const controls = useAnimation();

  // --- ETF Balance Fetching ---
  useEffect(() => {
    if (!wallet.publicKey) return;
    const fetchEtfBalance = async () => {
        try {
            // 共通トークンの残高を確認
            const userAta = await getAssociatedTokenAddress(MASTER_MINT_ADDRESS, wallet.publicKey!);
            const account = await connection.getTokenAccountBalance(userAta);
            setUserEtfBalance(account.value.uiAmount || 0);
        } catch (e) {
            setUserEtfBalance(0);
        }
    };
    fetchEtfBalance();
  }, [wallet.publicKey, connection, investStatus, isInvestOpen]);

  // --- Chart & Data ---
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
        const res = await api.getStrategyChart(strategy.id, timeframe, 'line');
        if (res.success && res.data) setChartData(res.data);
      } catch {}
    };
    loadChart();
  }, [strategy.id, timeframe]);

  const handleToggleWatchlist = async () => {
    if (!wallet.publicKey) return showToast("Connect wallet required", "info");
    const nextState = !isWatchlisted;
    setIsWatchlisted(nextState);
    try { await api.toggleWatchlist(strategy.id, wallet.publicKey.toBase58()); } catch (e) { setIsWatchlisted(!nextState); }
  };

  const handleCopyCA = () => {
    navigator.clipboard.writeText(MASTER_MINT_ADDRESS.toString());
    showToast("Token Address Copied", "success");
  };

  // --- Transaction Logic (Buy/Sell) ---
  const handleTransaction = async (amountStr: string, mode: 'BUY' | 'SELL') => {
    if (!wallet.publicKey) return showToast("Connect Wallet", "error");
    
    // Vault Address (運営の受け取り先)
    // strategy.vaultAddress があればそれを使う、なければバックエンドの Admin Pubkey
    const vaultAddressStr = (strategy as any).vaultAddress || (strategy as any).ownerPubkey;
    if (!vaultAddressStr) {
        showToast("System Error: Vault not found", "error");
        return;
    }
    const vaultPubkey = new PublicKey(vaultAddressStr);

    setInvestStatus('SIGNING');
    try {
      const amount = parseFloat(amountStr);
      const transaction = new Transaction();

      if (mode === 'BUY') {
        // --- BUY: SOL Transfer ---
        const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: vaultPubkey,
            lamports,
          })
        );
      } 
      else {
        // --- SELL: ETF Token Transfer ---
        // 1. User ATA
        const userAta = await getAssociatedTokenAddress(MASTER_MINT_ADDRESS, wallet.publicKey);
        // 2. Vault ATA
        const vaultAta = await getAssociatedTokenAddress(MASTER_MINT_ADDRESS, vaultPubkey);

        const decimals = 9; // Common Token Decimals
        const tokenAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)));

        transaction.add(
          createTransferInstruction(
            userAta,      // From
            vaultAta,     // To
            wallet.publicKey, // Owner
            tokenAmount,
            [],
            TOKEN_PROGRAM_ID
          )
        );
      }

      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = wallet.publicKey;

      if (!wallet.signTransaction) throw new Error("Wallet not supported");

      const signedTx = await wallet.signTransaction(transaction);
      setInvestStatus('CONFIRMING');
      const signature = await connection.sendRawTransaction(signedTx.serialize());

      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });

      setInvestStatus('PROCESSING');
      
      // ▼▼▼ 追加: バックエンドに通知して、反対売買（お返し）を実行させる ▼▼▼
      try {
          // 本来は api.ts に関数を作るべきですが、手っ取り早くここでfetchします
          // あなたのAPIのURLに書き換えてください
          const API_BASE = "https://axis-api.yusukekikuta-05.workers.dev"; 
          
          await fetch(`${API_BASE}/trade`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  userPubkey: wallet.publicKey.toBase58(),
                  amount: parseFloat(amountStr),
                  mode: mode,      // 'BUY' or 'SELL'
                  signature: signature,
                  strategyId: strategy.id
              })
          });
      } catch (apiErr) {
          console.error("API Call Failed:", apiErr);
          // トランザクション自体は成功しているのでエラーにはしない
      }
      
      // Helius Webhook待ち (演出)
      setTimeout(() => {
        setInvestStatus('SUCCESS');
        const msg = mode === 'BUY' ? `Received ${amount} AXIS` : `Sold ${amount} AXIS`;
        showToast(`Success! ${msg}`, "success");

        // バックエンドに通知 (念のため)
        // api.notifySwap(signature, mode, amount); 

        setTimeout(() => {
          setIsInvestOpen(false);
          setInvestStatus('IDLE');
        }, 2000);
      }, 1500);

    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Transaction Failed", "error");
      setInvestStatus('ERROR');
      setTimeout(() => setInvestStatus('IDLE'), 2000);
    }
  };

  return (
    <div className="h-screen bg-black text-[#E7E5E4] font-sans selection:bg-[#D97706]/30 flex flex-col overflow-hidden">
      
      {/* Header */}
      <motion.div className="absolute top-0 inset-x-0 z-[100] flex items-center justify-between px-4 py-3 safe-area-top pointer-events-none">
        <motion.div className="absolute inset-0 bg-black/80 backdrop-blur-md border-b border-white/5 pointer-events-auto" style={{ opacity: headerOpacity }} />
        <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="relative z-50 w-10 h-10 flex items-center justify-center text-white/90 hover:text-white bg-black/40 rounded-full backdrop-blur-md transition-all active:scale-90 pointer-events-auto shadow-sm border border-white/5 cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <motion.div style={{ opacity: headerOpacity, y: headerY }} className="relative z-10 font-bold text-sm tracking-wide pointer-events-none">{strategy?.ticker}</motion.div>
        <div className="relative z-10 flex gap-2 pointer-events-auto">
          <button onClick={handleToggleWatchlist} className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-yellow-400 bg-black/40 rounded-full backdrop-blur-md border border-white/5 active:scale-95 transition-all">
            <motion.div animate={controls}><Star className={`w-5 h-5 ${isWatchlisted ? 'fill-yellow-400 text-yellow-400' : ''}`} /></motion.div>
          </button>
          <button className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white bg-black/40 rounded-full backdrop-blur-md border border-white/5 active:scale-95 transition-all">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-32 no-scrollbar">
        <div className="px-4 md:px-24 pt-24 space-y-6">
          <div className="flex flex-col items-start">
              <h1 className="text-xl font-bold text-[#78716C] mb-1">{strategy?.name}</h1>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-serif font-bold tracking-tighter text-white">${latestValue?.toFixed(2)}</span>
              </div>
              <div className={`flex items-center gap-1 mt-2 text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(changePct).toFixed(2)}% <span className="text-[#57534E] font-normal ml-1">Today</span>
              </div>
          </div>

          <div className="w-full h-[280px]">
            <RichChart data={chartData || []} isPositive={isPositive} />
          </div>

          <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 md:-mx-6 px-4 md:px-6 pb-2">
            <div className="flex-shrink-0 min-w-[140px] p-4 bg-[#1C1917] rounded-2xl border border-white/5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[#78716C]"><Layers className="w-3.5 h-3.5" /><span className="text-[10px] uppercase font-bold tracking-wider">TVL</span></div>
                <p className="text-lg font-bold text-white">{typeof strategy?.tvl === 'number' ? (strategy.tvl >= 1000 ? `${(strategy.tvl/1000).toFixed(1)}k` : strategy.tvl.toFixed(0)) : '0'} <span className="text-xs font-normal text-[#57534E]">SOL</span></p>
            </div>
            <div className="flex-shrink-0 min-w-[140px] p-4 bg-[#1C1917] rounded-2xl border border-white/5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[#78716C]"><Activity className="w-3.5 h-3.5" /><span className="text-[10px] uppercase font-bold tracking-wider">ROI</span></div>
                <p className={`text-lg font-bold ${changePct >= 0 ? 'text-[#D97706]' : 'text-red-500'}`}>{changePct > 0 ? '+' : ''}{changePct?.toFixed(2)}%</p>
            </div>
            <button onClick={handleCopyCA} className="flex-shrink-0 min-w-[140px] p-4 bg-[#1C1917] rounded-2xl border border-white/5 flex flex-col gap-1 hover:bg-[#292524] transition-colors text-left group">
                <div className="flex items-center gap-1.5 text-[#78716C]"><Copy className="w-3.5 h-3.5" /><span className="text-[10px] uppercase font-bold tracking-wider">Contract</span></div>
                <p className="text-sm font-mono text-[#A8A29E] truncate w-full group-hover:text-white">{MASTER_MINT_ADDRESS.toString().slice(0, 4)}...{MASTER_MINT_ADDRESS.toString().slice(-4)}</p>
            </button>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#78716C] uppercase tracking-widest mb-4 flex items-center gap-2"><PieChart className="w-4 h-4" /> Composition</h3>
            <div className="bg-[#1C1917]/50 rounded-3xl border border-white/5 overflow-hidden">
              {(tokensInfo?.length ?? 0) > 0 ? tokensInfo.map((token, i) => (
                <div key={i} className={`relative p-4 ${i !== tokensInfo.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        {token.logoURI ? <img src={token.logoURI} alt={token.symbol} className="w-10 h-10 rounded-full bg-black object-cover" /> : <div className="w-10 h-10 rounded-full bg-[#292524] flex items-center justify-center font-bold text-xs text-[#D97706]">{token.symbol?.[0] || '?'}</div>}
                      </div>
                      <div className="min-w-0"><h4 className="font-bold text-white text-sm">{token.symbol || 'UNK'}</h4><p className="text-[10px] text-[#78716C] truncate">{token.name || 'Token'}</p></div>
                    </div>
                    <span className="font-bold text-white text-sm shrink-0 ml-2">{token.weight}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${token.weight}%` }} transition={{ duration: 1, delay: i * 0.1 }} className="h-full bg-[#D97706] rounded-full" /></div>
                </div>
              )) : <div className="text-center py-8 text-[#57534E] text-sm">Loading composition...</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="absolute bottom-0 inset-x-0 bg-[#0C0A09]/95 backdrop-blur-md border-t border-white/10 z-40 pt-3 px-6 pb-[calc(env(safe-area-inset-bottom,8px)+8px)]">
        <div className="flex items-center justify-between gap-4">
           <div className="flex flex-col">
              <span className="text-[10px] text-[#78716C] uppercase tracking-wider">Your AXIS</span>
              <span className="text-lg font-serif font-bold text-white">{userEtfBalance.toFixed(2)}</span>
           </div>
           <button onClick={() => setIsInvestOpen(true)} className="bg-[#D97706] text-black font-bold px-8 py-3 rounded-full shadow-[0_4px_20px_rgba(217,119,6,0.3)] active:scale-95 transition-all flex items-center gap-2">
             Trade <ArrowRight className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* InvestSheetの呼び出し。userEtfBalanceとonConfirm(handleTransaction)を渡す */}
      <InvestSheet isOpen={isInvestOpen} onClose={() => setIsInvestOpen(false)} strategy={strategy} onConfirm={handleTransaction} status={investStatus} userEtfBalance={userEtfBalance} />
    </div>
  );
};