import { useEffect, useState, useMemo, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useTransform as useMotionTransform,
  useAnimation,
} from 'framer-motion';
import {
  ArrowLeft,
  Copy,
  Star,
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  PieChart,
  Wallet,
  ArrowRight,
  X,
  Check,
  ArrowDown,
  Loader2,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { getUsdcBalance, getOrCreateUsdcAta, createUsdcTransferIx } from '../../services/usdc';
import { USDC_DECIMALS } from '../../config/constants';
import { RichChart } from '../common/RichChart';
import { api } from '../../services/api';
import type { Strategy } from '../../types';
import { useToast } from '../../context/ToastContext';

// 定数はコンポーネント外に定義
const MASTER_MINT_ADDRESS = new PublicKey('2JiisncKr8DhvA68MpszFDjGAVu2oFtqJJC837LLiKdT');

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

// 1. Swipe To Confirm
const SwipeToConfirm = ({
  onConfirm,
  isLoading,
  isSuccess,
  label,
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
  const progressWidth = useMotionTransform(
    x,
    [0, maxDrag],
    [HANDLE_SIZE + PADDING * 2, containerWidth]
  );

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
          : 'bg-[#1C1C1E] border-[rgba(255,255,255,0.1)]'
      }`}
    >
      <motion.div
        className={`absolute inset-y-0 left-0 rounded-full z-0 ${
          isSuccess ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#B8863F] to-[#D4A261]'
        }`}
        style={{ width: progressWidth }}
      />

      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        style={{ opacity: textOpacity }}
      >
        <span className="font-bold text-xs tracking-[0.2em] text-white/50 animate-pulse">
          {isLoading ? 'PROCESSING...' : label}
        </span>
      </motion.div>

      {isSuccess && (
        <div className="absolute inset-0 flex items-center justify-center z-20 text-white font-bold tracking-widest text-sm">
          SUCCESS
        </div>
      )}

      <motion.div
        drag={!isLoading && !isSuccess ? 'x' : false}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.05}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x, touchAction: 'pan-x' }}
        className="relative top-1 left-1 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing z-30"
      >
        {isLoading ? (
          <Loader2 className="w-6 h-6 text-[#B8863F] animate-spin" />
        ) : isSuccess ? (
          <Check className="w-6 h-6 text-emerald-600" />
        ) : (
          <ChevronRight className="w-6 h-6 text-[#B8863F]" />
        )}
      </motion.div>
    </div>
  );
};

// 2. InvestSheet (Full Screen Phantom Style)
interface InvestSheetProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: Strategy;
  onConfirm: (amount: string, mode: 'BUY' | 'SELL') => Promise<void>;
  status: TransactionStatus;
  userEtfBalance: number;
}

const InvestSheet = ({
  isOpen,
  onClose,
  strategy,
  onConfirm,
  status,
  userEtfBalance,
}: InvestSheetProps) => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState('0');
  const [usdcBalance, setUsdcBalance] = useState(0);
  const MOCK_PRICE_PER_TOKEN = 1.0; // 1:1 Rate

  useEffect(() => {
    if (!publicKey || !isOpen) return;
    const fetchBalance = async () => {
      try {
        const bal = await getUsdcBalance(connection, publicKey);
        setUsdcBalance(bal);
      } catch {}
    };
    fetchBalance();
  }, [isOpen, publicKey, connection]);

  useEffect(() => {
    if (isOpen) {
      setAmount('0');
      setMode('BUY');
    }
  }, [isOpen]);

  const estimatedOutput = useMemo(() => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return '0.00';
    return (val * MOCK_PRICE_PER_TOKEN).toFixed(4); // 1:1 conversion
  }, [amount, mode]);

  const currentBalance = mode === 'BUY' ? usdcBalance : userEtfBalance;
  const ticker = strategy.ticker || 'ETF';

  const handleNum = (num: string) => {
    if (status !== 'IDLE' && status !== 'ERROR') return;
    if (amount === '0' && num !== '.') setAmount(num);
    else if (amount.includes('.') && num === '.') return;
    else if (amount.length < 9) setAmount((prev) => prev + num);
  };

  const handleBackspace = () => {
    if (status !== 'IDLE' && status !== 'ERROR') return;
    setAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  };

  const handleExecute = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      showToast('Enter valid amount', 'error');
      return;
    }
    if (val > currentBalance) {
      showToast('Insufficient balance', 'error');
      return;
    }
    onConfirm(amount, mode);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          // ★変更: 全画面固定 (z-index最強, 背景色をPhantom風の黒へ)
          className="fixed inset-0 z-[99999] bg-[#0C0C0C] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-12 pb-4 shrink-0 safe-area-top">
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {/* Mode Toggle Pills */}
            <div className="flex bg-[#1C1C1E] p-1 rounded-full border border-white/5">
              <button
                onClick={() => setMode('BUY')}
                className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  mode === 'BUY' ? 'bg-[#B8863F] text-black' : 'text-[#78716C]'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setMode('SELL')}
                className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  mode === 'SELL' ? 'bg-[#B8863F] text-black' : 'text-[#78716C]'
                }`}
              >
                Sell
              </button>
            </div>
            <div className="w-10 h-10" /> {/* Spacer */}
          </div>

          {/* Main Content (Center) */}
          <div className="flex-1 flex flex-col justify-center items-center relative w-full px-6">
            {/* Amount Display */}
            <div className="flex flex-col items-center gap-2 mb-8">
              <div className="flex items-baseline justify-center gap-1">
                <span
                  className={`font-sans font-medium text-6xl tracking-tight ${amount === '0' ? 'text-[#57534E]' : 'text-white'}`}
                >
                  {amount}
                </span>
              </div>
              <span className="text-[#78716C] font-bold text-lg">
                {mode === 'BUY' ? 'USDC' : ticker}
              </span>
            </div>

            {/* Available Balance Pill */}
            <div className="flex items-center gap-2 bg-[#1C1C1E] py-2 px-4 rounded-full border border-white/5 mb-8">
              <Wallet className="w-3.5 h-3.5 text-[#78716C]" />
              <span className="text-[#A8A29E] text-xs font-mono">
                Available: {currentBalance.toFixed(4)} {mode === 'BUY' ? 'USDC' : ticker}
              </span>
              <button
                onClick={() => setAmount((currentBalance * (mode === 'BUY' ? 0.95 : 1)).toFixed(4))}
                className="text-[#B8863F] text-xs font-bold uppercase hover:text-white transition-colors"
              >
                Max
              </button>
            </div>

            {/* Estimated Output (Optional) */}
            {amount !== '0' && (
              <div className="absolute bottom-4 flex items-center gap-2 text-sm text-[#78716C]">
                <ArrowDown className="w-4 h-4" />
                <span>
                  Receive approx. {estimatedOutput} {mode === 'BUY' ? ticker : 'USDC'}
                </span>
              </div>
            )}
          </div>

          {/* Keypad & Action (Bottom) */}
          <div className="shrink-0 w-full px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] bg-[#0C0C0C]">
            {/* Numpad */}
            {(status === 'IDLE' || status === 'ERROR') && (
              <div className="grid grid-cols-3 gap-y-4 gap-x-6 mb-8 max-w-[320px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleNum(key.toString())}
                    className="h-14 text-2xl font-medium text-white hover:bg-white/5 active:bg-white/10 rounded-full transition-all flex items-center justify-center select-none"
                  >
                    {key}
                  </button>
                ))}
                <button
                  onClick={handleBackspace}
                  className="h-14 flex items-center justify-center text-white hover:bg-white/5 rounded-full active:scale-95 transition-all"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              </div>
            )}

            {/* Status / Swipe */}
            <div className="max-w-[340px] mx-auto w-full">
              {/* 修正: 処理中のステータスを明示的に指定 */}
              {status === 'SIGNING' || status === 'CONFIRMING' || status === 'PROCESSING' ? (
                <div className="w-full h-16 bg-[#1C1C1E] rounded-full flex items-center justify-center gap-3 border border-white/5">
                  <Loader2 className="w-5 h-5 text-[#B8863F] animate-spin" />
                  <span className="text-white font-bold tracking-wide text-sm">PROCESSING...</span>
                </div>
              ) : (
                <SwipeToConfirm
                  onConfirm={handleExecute}
                  isLoading={false}
                  isSuccess={status === 'SUCCESS'}
                  label={`SLIDE TO ${mode}`}
                />
              )}
            </div>
          </div>
        </motion.div>
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
            const meta = (tokenRes.tokens || []).find(
              (m: any) => m.symbol === t.symbol?.toUpperCase()
            );
            return { ...t, logoURI: meta?.logoURI, name: meta?.name || t.symbol };
          });
          setTokensInfo(enriched);
        } else {
          setTokensInfo(strategy.tokens || []);
        }
      } catch {
        setTokensInfo(strategy.tokens || []);
      }
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

  // ▼▼▼ 修正: アニメーションの復活とUI改善 ▼▼▼
  const handleToggleWatchlist = async () => {
    if (!wallet.publicKey) {
      showToast('Connect wallet required', 'info');
      return;
    }

    // 1. アニメーション実行 (クルッと回ってポンと弾む)
    controls.set({ rotate: 0, scale: 1 });
    controls.start({
      rotate: 360,
      scale: [1, 1.4, 1],
      transition: { duration: 0.5, type: 'spring', stiffness: 260, damping: 20 },
    });

    const nextState = !isWatchlisted;
    setIsWatchlisted(nextState);

    try {
      await api.toggleWatchlist(strategy.id, wallet.publicKey.toBase58());
    } catch (e: any) {
      setIsWatchlisted(!nextState); // 失敗したら戻す
      showToast('Failed to update', 'error');
    }
  };
  // ▲▲▲ 修正ここまで ▲▲▲

  const handleCopyCA = () => {
    navigator.clipboard.writeText(MASTER_MINT_ADDRESS.toString());
    showToast('Token Address Copied', 'success');
  };

  const handleShareToX = () => {
    const text = `Check out ${strategy.name} ($${strategy.ticker}) on Axis! 🚀`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`,
      '_blank'
    );
  };

  // --- Transaction Logic ---
  const handleTransaction = async (amountStr: string, mode: 'BUY' | 'SELL') => {
    if (!wallet.publicKey) return showToast('Connect Wallet', 'error');

    const vaultAddressStr = (strategy as any).vaultAddress || (strategy as any).ownerPubkey;
    if (!vaultAddressStr) {
      showToast('System Error: Vault not found', 'error');
      return;
    }
    const vaultPubkey = new PublicKey(vaultAddressStr);

    setInvestStatus('SIGNING');
    try {
      // SOL残高チェック（ガス代 + ATA作成に最低 0.005 SOL 必要）
      const solBalance = await connection.getBalance(wallet.publicKey);
      if (solBalance < 5_000_000) {
        // 0.005 SOL
        showToast('Not enough SOL for gas fees. Use the faucet first.', 'error');
        setInvestStatus('ERROR');
        setTimeout(() => setInvestStatus('IDLE'), 2000);
        return;
      }

      const amount = parseFloat(amountStr);
      const transaction = new Transaction();

      if (mode === 'BUY') {
        // USDC SPL transfer
        const { ata: fromAta, instruction: createFromIx } = await getOrCreateUsdcAta(
          connection,
          wallet.publicKey,
          wallet.publicKey
        );
        const { ata: toAta, instruction: createToIx } = await getOrCreateUsdcAta(
          connection,
          wallet.publicKey,
          vaultPubkey
        );
        transaction.add(createFromIx);
        transaction.add(createToIx);
        transaction.add(createUsdcTransferIx(fromAta, toAta, wallet.publicKey, amount));

        console.log(
          '[BUY] fromAta:',
          fromAta.toBase58(),
          'toAta:',
          toAta.toBase58(),
          'vault:',
          vaultPubkey.toBase58(),
          'amount:',
          amount
        );
      } else {
        const userAta = await getAssociatedTokenAddress(MASTER_MINT_ADDRESS, wallet.publicKey);
        const vaultAta = await getAssociatedTokenAddress(MASTER_MINT_ADDRESS, vaultPubkey);
        const decimals = 9;
        const tokenAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)));

        transaction.add(
          createTransferInstruction(
            userAta, // From
            vaultAta, // To
            wallet.publicKey, // Owner
            tokenAmount,
            [],
            TOKEN_PROGRAM_ID
          )
        );

        console.log('[SELL] userAta:', userAta.toBase58(), 'vaultAta:', vaultAta.toBase58());
      }

      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = wallet.publicKey;

      if (!wallet.signTransaction) throw new Error('Wallet not supported');

      const signedTx = await wallet.signTransaction(transaction);

      // シミュレーション事前チェック（署名済み tx で実行）
      const simResult = await connection.simulateTransaction(signedTx);
      if (simResult.value.err) {
        console.error('[Simulation Failed]', JSON.stringify(simResult.value.err));
        console.error('[Simulation Logs]', simResult.value.logs);
        throw new Error(
          `Simulation failed: ${JSON.stringify(simResult.value.err)}${simResult.value.logs ? '\n' + simResult.value.logs.join('\n') : ''}`
        );
      }

      setInvestStatus('CONFIRMING');
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        maxRetries: 3,
      });

      await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        'confirmed'
      );

      setInvestStatus('PROCESSING');

      try {
        const API_BASE = 'https://axis-api.yusukekikuta-05.workers.dev';
        await fetch(`${API_BASE}/trade`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userPubkey: wallet.publicKey.toBase58(),
            amount: parseFloat(amountStr),
            mode: mode,
            signature: signature,
            strategyId: strategy.id,
          }),
        });
      } catch {}

      setTimeout(() => {
        setInvestStatus('SUCCESS');
        const msg = mode === 'BUY' ? `Received ${amount} AXIS` : `Sold ${amount} AXIS`;
        showToast(`Success! ${msg}`, 'success');

        setTimeout(() => {
          setIsInvestOpen(false);
          setInvestStatus('IDLE');
        }, 2000);
      }, 1500);
    } catch (e: any) {
      console.error('Transaction Error:', e);
      const msg = e?.logs?.join('\n') || e?.message || 'Transaction Failed';
      showToast(msg.slice(0, 120), 'error');
      setInvestStatus('ERROR');
      setTimeout(() => setInvestStatus('IDLE'), 2000);
    }
  };

  return (
    <div className="h-screen bg-black text-[#E7E5E4] font-sans selection:bg-[#B8863F]/30 flex flex-col overflow-hidden">
      {/* 1. Immersive Header */}
      <motion.div className="absolute top-0 inset-x-0 z-[9999] flex items-center justify-between px-4 py-3 safe-area-top pointer-events-none">
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-md border-b border-[rgba(184,134,63,0.08)] pointer-events-auto"
          style={{ opacity: headerOpacity }}
        />

        <button
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
          className="relative z-50 w-10 h-10 flex items-center justify-center text-white/90 hover:text-white bg-black/40 rounded-full backdrop-blur-md transition-all active:scale-90 pointer-events-auto shadow-sm border border-[rgba(184,134,63,0.08)] cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <motion.div
          style={{ opacity: headerOpacity, y: headerY }}
          className="relative z-10 font-bold text-sm tracking-wide pointer-events-none"
        >
          {strategy?.ticker}
        </motion.div>

        <div className="relative z-10 flex gap-2 pointer-events-auto">
          {/* ▼▼▼ 修正: アニメーション付きボタン ▼▼▼ */}
          <button
            onClick={handleToggleWatchlist}
            className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-yellow-400 bg-black/40 rounded-full backdrop-blur-md border border-[rgba(184,134,63,0.08)] active:scale-90 transition-all"
          >
            <motion.div animate={controls}>
              <Star
                className={`w-5 h-5 transition-colors duration-300 ${isWatchlisted ? 'fill-yellow-400 text-yellow-400' : ''}`}
              />
            </motion.div>
          </button>

          <button
            onClick={handleShareToX}
            className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white bg-black/40 rounded-full backdrop-blur-md border border-[rgba(184,134,63,0.08)] active:scale-90 transition-all"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* 2. Scrollable Content Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-32 no-scrollbar">
        <div className="px-4 md:px-24 pt-24 space-y-6">
          {/* Hero Section */}
          <div className="flex flex-col items-start">
            <h1 className="text-xl font-bold text-[#78716C] mb-1">{strategy?.name}</h1>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-serif font-bold tracking-tighter text-white">
                ${latestValue?.toFixed(2)}
              </span>
            </div>
            <div
              className={`flex items-center gap-1 mt-2 text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {Math.abs(changePct).toFixed(2)}%{' '}
              <span className="text-[#57534E] font-normal ml-1">Today</span>
            </div>
          </div>

          <div className="w-full h-[280px]">
            <RichChart data={chartData || []} isPositive={isPositive} />
          </div>

          {/* Stats Strip */}
          <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 md:-mx-6 px-4 md:px-6 pb-2">
            <div className="flex-shrink-0 min-w-[140px] p-4 bg-[#140E08] rounded-2xl border border-[rgba(184,134,63,0.08)] flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[#78716C]">
                <Layers className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">TVL</span>
              </div>
              <p className="text-lg font-bold text-white">
                {typeof strategy?.tvl === 'number'
                  ? strategy.tvl >= 1000
                    ? `${(strategy.tvl / 1000).toFixed(1)}k`
                    : strategy.tvl.toFixed(0)
                  : '0'}{' '}
                <span className="text-xs font-normal text-[#57534E]">USDC</span>
              </p>
            </div>

            <div className="flex-shrink-0 min-w-[140px] p-4 bg-[#140E08] rounded-2xl border border-[rgba(184,134,63,0.08)] flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[#78716C]">
                <Activity className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">ROI (All)</span>
              </div>
              <p
                className={`text-lg font-bold ${changePct >= 0 ? 'text-[#B8863F]' : 'text-red-500'}`}
              >
                {changePct > 0 ? '+' : ''}
                {changePct?.toFixed(2)}%
              </p>
            </div>

            <button
              onClick={handleCopyCA}
              className="flex-shrink-0 min-w-[140px] p-4 bg-[#140E08] rounded-2xl border border-[rgba(184,134,63,0.08)] flex flex-col gap-1 hover:bg-[#292524] transition-colors text-left group"
            >
              <div className="flex items-center gap-1.5 text-[#78716C]">
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Contract</span>
              </div>
              <p className="text-sm font-mono text-[#A8A29E] truncate w-full group-hover:text-white">
                {MASTER_MINT_ADDRESS.toString().slice(0, 4)}...
                {MASTER_MINT_ADDRESS.toString().slice(-4)}
              </p>
            </button>
          </div>

          {/* Composition List */}
          <div>
            <h3 className="text-sm font-bold text-[#78716C] uppercase tracking-widest mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4" /> Composition
            </h3>

            <div className="bg-[#140E08]/50 rounded-3xl border border-[rgba(184,134,63,0.08)] overflow-hidden">
              {(tokensInfo?.length ?? 0) > 0 ? (
                tokensInfo.map((token, i) => (
                  <div
                    key={i}
                    className={`relative p-4 ${i !== tokensInfo.length - 1 ? 'border-b border-[rgba(184,134,63,0.08)]' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          {token.logoURI ? (
                            <img
                              src={token.logoURI}
                              alt={token.symbol}
                              className="w-10 h-10 rounded-full bg-black object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#292524] flex items-center justify-center font-bold text-xs text-[#B8863F]">
                              {token.symbol?.[0] || '?'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-sm">{token.symbol || 'UNK'}</h4>
                          <p className="text-[10px] text-[#78716C] truncate">
                            {token.name || 'Token'}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-white text-sm shrink-0 ml-2">
                        {token.weight}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${token.weight}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className="h-full bg-[#B8863F] rounded-full"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-[#57534E] text-sm">
                  Loading composition...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Action Bar */}
      <div className="absolute bottom-0 inset-x-0 bg-[#080503]/95 backdrop-blur-md border-t border-[rgba(184,134,63,0.15)] z-40 pt-3 px-6 pb-[calc(env(safe-area-inset-bottom,8px)+8px)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#78716C] uppercase tracking-wider">Your AXIS</span>
            <span className="text-lg font-serif font-bold text-white">
              {userEtfBalance.toFixed(2)}
            </span>
          </div>

          <button
            onClick={() => setIsInvestOpen(true)}
            className="bg-[#B8863F] text-black font-bold px-8 py-3 rounded-full shadow-[0_4px_20px_rgba(184,134,63,0.3)] active:scale-95 transition-all flex items-center gap-2"
          >
            Trade <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <InvestSheet
        isOpen={isInvestOpen}
        onClose={() => setIsInvestOpen(false)}
        strategy={strategy}
        onConfirm={handleTransaction}
        status={investStatus}
        userEtfBalance={userEtfBalance}
      />
    </div>
  );
};
