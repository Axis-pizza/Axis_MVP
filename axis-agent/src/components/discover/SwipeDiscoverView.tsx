import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform as useMotionTransform,
} from 'framer-motion';
import {
  RefreshCw,
  Loader2,
  Sparkles,
  Rocket,
  X,
  Wallet,
  ArrowDown,
  ArrowLeft,
  ChevronRight,
  Check,
  ShoppingCart,
} from 'lucide-react';
import { SwipeCard } from './SwipeCard';
import { api } from '../../services/api';
import { useWallet, useConnection } from '../../hooks/useWallet';
import { PublicKey, Transaction } from '@solana/web3.js';
import { getUsdcBalance, getOrCreateUsdcAta, createUsdcTransferIx } from '../../services/usdc';
import { JupiterService } from '../../services/jupiter';
import { DexScreenerService } from '../../services/dexscreener';
import { useToast } from '../../context/ToastContext';

type TransactionStatus = 'IDLE' | 'SIGNING' | 'CONFIRMING' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

// --- Types ---
interface TokenData {
  symbol: string;
  price: number;
  change24h: number;
  logoURI?: string;
  address: string;
}

interface SwipeDiscoverViewProps {
  onToggleView: () => void;
  onStrategySelect: (strategy: any) => void;
  onOverlayChange?: (isActive: boolean) => void;
  focusedStrategyId?: string | null;
}

// --- Components ---

/**
 * ★追加: リアルなカード型のスケルトンローダー
 */
const SwipeCardSkeleton = memo(({ index }: { index: number }) => (
  <div
    className="absolute inset-0 w-full h-full bg-[#121212] border border-[rgba(184,134,63,0.15)] rounded-[32px] overflow-hidden shadow-2xl flex flex-col p-5 select-none pointer-events-none"
    style={{
      // スタック表示のシミュレーション
      transform: `scale(${1 - index * 0.05}) translateY(${index * 10}px)`,
      zIndex: 100 - index,
      opacity: Math.max(0, 1 - index * 0.3),
      filter: 'grayscale(100%) brightness(0.8)',
    }}
  >
    {/* Header Skeleton */}
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-2">
        <div className="w-16 h-5 bg-white/10 rounded-full animate-pulse" />
        <div className="w-40 h-8 bg-white/10 rounded-lg animate-pulse" />
      </div>
      <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse border border-[rgba(184,134,63,0.08)]" />
    </div>

    {/* Description Skeleton */}
    <div className="space-y-2 mb-6">
      <div className="w-full h-3 bg-white/5 rounded animate-pulse" />
      <div className="w-3/4 h-3 bg-white/5 rounded animate-pulse" />
    </div>

    {/* Stats Grid Skeleton */}
    <div className="grid grid-cols-2 gap-2 mb-4">
      <div className="h-24 bg-white/5 rounded-2xl animate-pulse border border-[rgba(184,134,63,0.08)]" />
      <div className="flex flex-col gap-2 h-24">
        <div className="flex-1 bg-white/5 rounded-xl animate-pulse border border-[rgba(184,134,63,0.08)]" />
        <div className="flex-1 bg-white/5 rounded-xl animate-pulse border border-[rgba(184,134,63,0.08)]" />
      </div>
    </div>

    {/* List Skeleton */}
    <div className="flex-1 space-y-2 mt-2 overflow-hidden">
      <div className="flex justify-between mb-2 px-1">
        <div className="w-24 h-3 bg-white/5 rounded animate-pulse" />
        <div className="w-12 h-3 bg-white/5 rounded animate-pulse" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 bg-white/5 rounded-xl h-14 animate-pulse border border-[rgba(184,134,63,0.08)]"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/10" />
            <div className="space-y-1.5">
              <div className="w-12 h-3 bg-white/10 rounded" />
              <div className="w-8 h-2 bg-white/10 rounded" />
            </div>
          </div>
          <div className="w-10 h-4 bg-white/10 rounded" />
        </div>
      ))}
    </div>
  </div>
));

/**
 * CosmicLaunchEffect
 * (変更なし)
 */
const CosmicLaunchEffect = memo(() => {
  const trailCount = 6;
  const particleCount = 18;
  const random = (min: number, max: number) => Math.random() * (max - min) + min;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: trailCount }).map((_, i) => {
        const delay = random(0, 0.3);
        const duration = random(0.6, 1.0);
        const startX = -10;
        const endX = 120;
        const startY = 110;
        const endY = -20;
        const width = random(2, 6);

        return (
          <motion.div
            key={`trail-${i}`}
            initial={{ opacity: 0, x: `${startX}vw`, y: `${startY}vh`, rotate: 45 }}
            animate={{
              opacity: [0, 0.8, 0],
              x: [`${startX}vw`, `${endX}vw`],
              y: [`${startY}vh`, `${endY}vh`],
            }}
            transition={{ duration, delay, ease: [0.1, 0, 0.3, 1] }}
            style={{
              position: 'absolute',
              width: `${width}px`,
              height: '30vh',
              background:
                'linear-gradient(to top, transparent, #D4A261, #f97316, #22d3ee, transparent)',
              willChange: 'transform, opacity',
            }}
          />
        );
      })}
      {Array.from({ length: particleCount }).map((_, i) => {
        const delay = random(0, 0.5);
        const duration = random(0.8, 1.6);
        const size = random(2, 5);
        const startX = random(-10, 40);
        const startY = random(80, 120);
        const moveX = random(50, 150);
        const moveY = random(-50, -150);
        const colors = ['#D4A261', '#f97316', '#22d3ee', '#ffffff'];
        const color = colors[Math.floor(random(0, colors.length))];

        return (
          <motion.div
            key={`particle-${i}`}
            initial={{ opacity: 0, x: `${startX}vw`, y: `${startY}vh`, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              x: `${startX + moveX}vw`,
              y: `${startY + moveY}vh`,
              scale: [0, random(1, 1.5), 0],
            }}
            transition={{ duration, delay, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color,
              borderRadius: '50%',
              willChange: 'transform, opacity',
            }}
          />
        );
      })}
      {/* Ambient glow — static gradient, no blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.4, 0] }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full z-[-1]"
        style={{
          background:
            'radial-gradient(circle, rgba(249,115,22,0.3) 0%, rgba(34,211,238,0.15) 40%, transparent 70%)',
        }}
      />
    </div>
  );
});

// --- SwipeToConfirm (Reused from StrategyDetailView) ---
const SwipeToConfirm = memo(
  ({
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
            : 'bg-[#140E08] border-[rgba(184,134,63,0.15)] shadow-inner'
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
            {isLoading ? 'PROCESSING...' : `SLIDE TO ${label}`}
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
  }
);

// --- InvestSheet (Reused from StrategyDetailView) ---
interface InvestSheetProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: any;
  onConfirm: (amount: string) => Promise<void>;
  status: TransactionStatus;
}

const InvestSheet = ({ isOpen, onClose, strategy, onConfirm, status }: InvestSheetProps) => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { showToast } = useToast();

  const [amount, setAmount] = useState('0');
  const [balance, setBalance] = useState(0);

  const MOCK_RATE = 100;
  const estimatedOutput =
    parseFloat(amount) > 0 ? (parseFloat(amount) * MOCK_RATE).toFixed(2) : '0.00';

  useEffect(() => {
    if (!publicKey || !isOpen) return;
    const fetchBalance = async () => {
      try {
        const bal = await getUsdcBalance(connection, publicKey);
        setBalance(bal);
      } catch {}
    };
    fetchBalance();
  }, [isOpen, publicKey, connection]);

  useEffect(() => {
    if (isOpen) setAmount('0');
  }, [isOpen]);

  const handleNum = (num: string) => {
    if (status !== 'IDLE' && status !== 'ERROR') return;
    if (amount === '0' && num !== '.') setAmount(num);
    else if (amount.includes('.') && num === '.') return;
    else if (amount.length < 8) setAmount((prev) => prev + num);
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
    onConfirm(amount);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[300]"
            onClick={
              status === 'IDLE' || status === 'ERROR' || status === 'SUCCESS' ? onClose : undefined
            }
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-[#080503] rounded-t-[32px] z-[310] overflow-hidden flex flex-col safe-area-bottom border-t border-[rgba(184,134,63,0.15)] shadow-2xl"
            style={{ maxHeight: '92vh' }}
          >
            <div
              className="w-full flex justify-center pt-4 pb-2"
              onClick={status === 'IDLE' ? onClose : undefined}
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full" />
            </div>

            <div className="px-6 pt-2 pb-8 flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={onClose}
                  disabled={
                    status === 'SIGNING' || status === 'CONFIRMING' || status === 'PROCESSING'
                  }
                  className="p-2 -ml-2 rounded-full text-[#78716C] hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30"
                >
                  <X className="w-6 h-6" />
                </button>
                <span className="text-sm font-bold text-[#78716C] uppercase tracking-wider">
                  Buy {strategy.ticker || 'ETF'}
                </span>
                <div className="w-8" />
              </div>

              <div className="flex-1 flex flex-col justify-center items-center mb-8 relative">
                {status !== 'IDLE' && status !== 'ERROR' ? (
                  /* Step Indicator during transaction */
                  <div className="flex flex-col items-center gap-6 py-4">
                    <div className="flex items-center gap-3">
                      {(['SIGNING', 'CONFIRMING', 'PROCESSING', 'SUCCESS'] as const).map(
                        (step, i) => {
                          const steps = ['SIGNING', 'CONFIRMING', 'PROCESSING', 'SUCCESS'];
                          const currentIdx = steps.indexOf(status);
                          const isActive = i <= currentIdx;
                          const isCurrent = i === currentIdx;
                          return (
                            <div key={step} className="flex items-center gap-3">
                              <div
                                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                  isActive
                                    ? step === 'SUCCESS'
                                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                                      : 'bg-[#B8863F] shadow-[0_0_8px_rgba(184,134,63,0.6)]'
                                    : 'bg-white/10'
                                } ${isCurrent && status !== 'SUCCESS' ? 'animate-pulse' : ''}`}
                              />
                              {i < 3 && (
                                <div
                                  className={`w-8 h-0.5 transition-all duration-300 ${i < currentIdx ? 'bg-[#B8863F]' : 'bg-white/10'}`}
                                />
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-white mb-1">
                        {status === 'SIGNING' && 'Waiting for wallet signature...'}
                        {status === 'CONFIRMING' && 'Confirming on Solana...'}
                        {status === 'PROCESSING' && 'Processing token transfer...'}
                        {status === 'SUCCESS' && 'Complete!'}
                      </p>
                      <p className="text-xs text-[#78716C]">
                        {status === 'SIGNING' && 'Approve the transaction in your wallet'}
                        {status === 'CONFIRMING' && 'This may take a few seconds'}
                        {status === 'PROCESSING' && 'Webhook is distributing your tokens'}
                        {status === 'SUCCESS' &&
                          `You received ${estimatedOutput} ${strategy.ticker || 'ETF'}`}
                      </p>
                    </div>
                    {status === 'SUCCESS' && (
                      <div className="text-4xl">
                        <Check className="w-12 h-12 text-emerald-400" />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Normal input display */
                  <>
                    <div className="flex flex-col items-center z-10">
                      <div className="flex items-baseline justify-center gap-2 mb-1">
                        <span
                          className={`font-serif font-bold text-white tracking-tighter transition-all duration-200 ${amount === '0' ? 'text-white/30' : 'text-white'} text-6xl`}
                        >
                          {amount}
                        </span>
                        <span className="text-xl font-bold text-[#B8863F]">USDC</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#78716C] font-mono bg-white/5 py-1.5 px-3 rounded-full border border-[rgba(184,134,63,0.08)]">
                        <Wallet className="w-3 h-3" />
                        <span>{balance.toFixed(4)} Available</span>
                        <button
                          onClick={() => setAmount((balance * 0.95).toFixed(4))}
                          className="text-[#B8863F] font-bold hover:text-[#D4A261] transition-colors"
                          disabled={status !== 'IDLE' && status !== 'ERROR'}
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    <div className="my-6 text-white/20 animate-bounce">
                      <ArrowDown className="w-6 h-6" />
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="text-sm font-bold text-[#78716C] uppercase mb-1">
                        You Receive (Est.)
                      </div>
                      <div className="flex items-center gap-2 text-3xl font-bold text-white">
                        <span>{estimatedOutput}</span>
                        <span className="text-emerald-400">{strategy.ticker || 'TOKEN'}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {(status === 'IDLE' || status === 'ERROR') && (
                <div className="grid grid-cols-3 gap-3 mb-8 max-w-[280px] mx-auto w-full">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((key) => (
                    <button
                      key={key}
                      onClick={() => handleNum(key.toString())}
                      className="h-14 text-2xl font-medium text-white/90 hover:bg-white/5 active:bg-white/10 rounded-2xl transition-all flex items-center justify-center disabled:opacity-30"
                      disabled={status !== 'IDLE' && status !== 'ERROR'}
                    >
                      {key}
                    </button>
                  ))}
                  <button
                    onClick={handleBackspace}
                    className="h-14 text-[#78716C] hover:text-white hover:bg-white/5 active:bg-white/10 rounded-2xl transition-all flex items-center justify-center disabled:opacity-30"
                    disabled={status !== 'IDLE' && status !== 'ERROR'}
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                </div>
              )}

              <div className="max-w-[320px] mx-auto w-full">
                <SwipeToConfirm
                  onConfirm={handleExecute}
                  isLoading={
                    status === 'SIGNING' || status === 'CONFIRMING' || status === 'PROCESSING'
                  }
                  isSuccess={status === 'SUCCESS'}
                  label={`BUY ${strategy.ticker || 'ETF'}`}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/**
 * SuccessOverlay — with Buy Now button
 */
const SuccessOverlay = ({
  strategy,
  onClose,
  onGoToStrategy,
  onBuy,
}: {
  strategy: any;
  onClose: () => void;
  onGoToStrategy: () => void;
  onBuy: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/[0.97] p-6 touch-none overflow-hidden"
    >
      <CosmicLaunchEffect />
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-900/20 via-transparent to-blue-900/20 pointer-events-none" />

      <motion.div
        initial={{ scale: 0.8, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 100, delay: 0.1 }}
        className="relative mb-10 z-20 text-center"
      >
        <h1 className="text-5xl md:text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-200 to-orange-500 drop-shadow-[0_0_30px_rgba(234,88,12,0.8)] transform -rotate-3 leading-none tracking-tight">
          READY FOR
          <br />
          TAKEOFF
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 50, rotateX: 20 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ delay: 0.3, type: 'spring' }}
        className="w-full max-w-xs bg-[#140E08] rounded-3xl border border-[rgba(184,134,63,0.25)] p-5 mb-8 relative overflow-hidden shadow-2xl z-20"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-500 via-yellow-400 to-cyan-500" />
        <div className="flex items-center gap-4 mb-5 pt-2">
          <div className="relative">
            <img
              src={
                strategy.creatorPfpUrl ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${strategy.creatorAddress}`
              }
              alt="creator"
              className="w-16 h-16 rounded-full border-2 border-[rgba(184,134,63,0.15)] bg-black object-cover"
            />
            <div className="absolute -bottom-2 -right-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#140E08] shadow-lg flex items-center gap-1">
              ROI {(strategy.roi || 0).toFixed(0)}%
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-xl leading-tight truncate">{strategy.name}</h3>
            <p className="text-xs text-white/40 font-mono mt-1 flex items-center gap-1">
              By {strategy.creatorAddress?.slice(0, 4)}...{strategy.creatorAddress?.slice(-4)}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-hidden pl-1 opacity-90">
          {(strategy.tokens || []).slice(0, 6).map((t: any, i: number) => (
            <div
              key={i}
              className="w-9 h-9 rounded-full bg-black flex items-center justify-center border border-[rgba(184,134,63,0.15)] shadow-lg relative -ml-2 first:ml-0 transition-transform hover:-translate-y-1"
            >
              {t.logoURI ? (
                <img
                  src={t.logoURI}
                  alt={t.symbol}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-[9px] text-white font-bold">{t.symbol?.[0]}</span>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="flex flex-col gap-3 w-full max-w-xs z-20 safe-area-bottom">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={onBuy}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group w-full py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-black text-lg rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 relative overflow-hidden"
        >
          <span className="relative z-10 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" /> Buy Now
          </span>
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={onGoToStrategy}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group w-full py-4 bg-gradient-to-r from-orange-600 to-yellow-600 text-white font-black text-lg rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all flex items-center justify-center gap-2 relative overflow-hidden"
        >
          <span className="relative z-10 flex items-center gap-2">
            <Rocket className="w-5 h-5 fill-white" /> LFG (View Detail)
          </span>
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          onClick={onClose}
          className="w-full py-4 bg-white/5 border border-[rgba(184,134,63,0.15)] text-white/60 font-bold text-lg rounded-2xl hover:bg-white/10 hover:text-white active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          Keep Scouting
        </motion.button>
      </div>
    </motion.div>
  );
};

// --- Main View Component ---

export const SwipeDiscoverView = ({
  onToggleView,
  onStrategySelect,
  onOverlayChange,
  focusedStrategyId,
}: SwipeDiscoverViewProps) => {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const { connection } = useConnection();
  const { showToast } = useToast();

  const [strategies, setStrategies] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSwiping, setIsSwiping] = useState(false);
  const [matchedStrategy, setMatchedStrategy] = useState<any | null>(null);

  const [tokenDataMap, setTokenDataMap] = useState<Record<string, TokenData>>({});
  const [userMap, setUserMap] = useState<Record<string, any>>({});
  const [tickerMap, setTickerMap] = useState<Record<string, string>>({});

  // InvestSheet state
  const [isInvestOpen, setIsInvestOpen] = useState(false);
  const [investStatus, setInvestStatus] = useState<TransactionStatus>('IDLE');
  const [investTarget, setInvestTarget] = useState<any | null>(null);

  const dataFetched = useRef(false);
  const appliedFocusRef = useRef<string | null>(null);

  useEffect(() => {
    onOverlayChange?.(matchedStrategy !== null);
  }, [matchedStrategy, onOverlayChange]);

  useEffect(() => {
    if (dataFetched.current) return;
    dataFetched.current = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [publicRes, myRes, tokensRes] = await Promise.all([
          api.discoverStrategies(50).catch((e) => ({ strategies: [] })),
          publicKey
            ? api.getUserStrategies(publicKey.toBase58()).catch(() => ({ strategies: [] }))
            : Promise.resolve({ strategies: [] }),
          api.getTokens().catch(() => ({ tokens: [] })),
        ]);

        const initialMap: Record<string, TokenData> = {};
        const backendTokens = tokensRes.tokens || [];
        backendTokens.forEach((t: any) => {
          if (t.mint) {
            initialMap[t.mint] = {
              symbol: t.symbol?.toUpperCase() || 'UNKNOWN',
              price: t.price || 0,
              change24h: t.change24h || 0,
              logoURI: t.logoURI,
              address: t.mint,
            };
          }
        });

        const myApiStrats = myRes.strategies || myRes || [];
        const publicStrats = publicRes.strategies || [];
        const combined = [...myApiStrats, ...publicStrats];

        const uniqueMap = new Map();
        combined.forEach((item) => {
          if (item.id && !uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
          if (item.address && !uniqueMap.has(item.address)) uniqueMap.set(item.address, item);
        });
        const uniqueStrategies = Array.from(uniqueMap.values());
        setStrategies(uniqueStrategies);

        const allMints = new Set<string>();
        Object.keys(initialMap).forEach((m) => allMints.add(m));

        uniqueStrategies.forEach((s: any) => {
          let tokens = s.tokens || s.composition || [];
          if (typeof tokens === 'string') {
            try {
              tokens = JSON.parse(tokens);
            } catch {}
          }
          tokens.forEach((t: any) => {
            if (t.mint) {
              allMints.add(t.mint);
              if (!initialMap[t.mint]) {
                initialMap[t.mint] = {
                  symbol: t.symbol?.toUpperCase() || 'UNKNOWN',
                  price: 0,
                  change24h: 0,
                  logoURI: t.logoURI,
                  address: t.mint,
                };
              }
            }
          });
        });

        const mintArray = Array.from(allMints);
        if (mintArray.length > 0) {
          const [jupPrices, dexData] = await Promise.all([
            JupiterService.getPrices(mintArray).catch(() => ({})) as Promise<
              Record<string, number>
            >,
            DexScreenerService.getMarketData(mintArray).catch(() => ({})) as Promise<
              Record<string, { price: number; change24h: number }>
            >,
          ]);

          mintArray.forEach((mint) => {
            const current = initialMap[mint];
            if (!current) return;
            const price = jupPrices[mint] || dexData[mint]?.price || current.price;
            const change = dexData[mint]?.change24h || current.change24h;
            initialMap[mint] = { ...current, price, change24h: change };
          });
        }

        setTokenDataMap(initialMap);

        const creators = new Set<string>();
        uniqueStrategies.forEach((s: any) => {
          if (s.ownerPubkey) creators.add(s.ownerPubkey);
          if (s.creator) creators.add(s.creator);
        });

        if (creators.size > 0) {
          const creatorArray = Array.from(creators);
          const [users, creatorStrats] = await Promise.all([
            Promise.all(
              creatorArray.map((pubkey) =>
                api
                  .getUser(pubkey)
                  .then((res) => (res.success ? res.user : null))
                  .catch(() => null)
              )
            ),
            Promise.all(
              creatorArray.map((pubkey) =>
                api
                  .getUserStrategies(pubkey)
                  .then((res) => res.strategies || [])
                  .catch(() => [])
              )
            ),
          ]);

          const newUserMap: Record<string, any> = {};
          users.forEach((user) => {
            if (user && user.pubkey) newUserMap[user.pubkey] = user;
          });
          setUserMap(newUserMap);

          // /discover はtickerを返さないため、getUserStrategiesから補完
          const newTickerMap: Record<string, string> = {};
          creatorStrats.flat().forEach((s: any) => {
            if (s.id && s.ticker) newTickerMap[s.id] = s.ticker;
          });
          setTickerMap(newTickerMap);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [publicKey]);

  const enrichedStrategies = useMemo(() => {
    return strategies.map((s) => {
      let tokens = s.tokens || s.composition || [];
      if (typeof tokens === 'string') {
        try {
          tokens = JSON.parse(tokens);
        } catch (e) {
          tokens = [];
        }
      }

      const enrichedTokens = tokens.map((t: any) => {
        const tokenData = t.mint ? tokenDataMap[t.mint] : null;
        return {
          ...t,
          symbol: t.symbol?.toUpperCase(),
          currentPrice: tokenData?.price || 0,
          change24h: tokenData?.change24h || 0,
          logoURI: t.logoURI || tokenData?.logoURI || null,
          address: t.mint || null,
        };
      });

      let weightedSum = 0;
      let totalWeight = 0;
      enrichedTokens.forEach((t: any) => {
        const w = Number(t.weight) || 0;
        const change = Number(t.change24h) || 0;
        weightedSum += change * w;
        totalWeight += w;
      });
      const calculatedRoi = totalWeight > 0 ? weightedSum / totalWeight : 0;

      const ownerAddress = s.ownerPubkey || s.creator;
      const userProfile = userMap[ownerAddress];

      return {
        ...s,
        id: s.address || s.pubkey || s.id,
        name: s.name || 'Untitled Strategy',
        ticker: s.ticker || tickerMap[s.id] || '',
        type: s.type || 'BALANCED',
        tokens: enrichedTokens,
        roi: calculatedRoi,
        tvl: Number(s.tvl || 0),
        creatorAddress: ownerAddress || 'Unknown',
        creatorPfpUrl: userProfile?.avatar_url ? api.getProxyUrl(userProfile.avatar_url) : null,
        description: s.description || userProfile?.bio || '',
        createdAt: s.createdAt || Date.now() / 1000,
        mintAddress: s.mintAddress || null,
        vaultAddress: s.vaultAddress || null,
      };
    });
  }, [strategies, tokenDataMap, userMap, tickerMap]);

  // focusedStrategyId が指定されたら、enrichedStrategies 確定後に最前面へ移動
  useEffect(() => {
    if (!focusedStrategyId || focusedStrategyId === appliedFocusRef.current) return;
    if (enrichedStrategies.length === 0) return;
    const idx = enrichedStrategies.findIndex((s) => s.id === focusedStrategyId);
    if (idx >= 0) {
      setCurrentIndex(idx);
      appliedFocusRef.current = focusedStrategyId;
    }
  }, [focusedStrategyId, enrichedStrategies]);

  const handleSwipe = useCallback(
    (direction: 'left' | 'right', strategy: any) => {
      if (isSwiping || matchedStrategy) return;
      setIsSwiping(true);
      setCurrentIndex((prev) => prev + 1);
      if (direction === 'right') {
        setMatchedStrategy(strategy);
      }
      // Brief cooldown to prevent double-swipe
      setTimeout(() => setIsSwiping(false), 100);
    },
    [isSwiping, matchedStrategy]
  );

  const handleGoToStrategy = () => {
    if (matchedStrategy) {
      onStrategySelect(matchedStrategy);
      setMatchedStrategy(null);
    }
  };

  const handleCloseMatch = () => {
    setMatchedStrategy(null);
  };

  const handleBuyFromOverlay = () => {
    if (!matchedStrategy) return;
    if (!publicKey) {
      showToast('Connect Wallet', 'error');
      return;
    }
    setInvestTarget(matchedStrategy);
    setIsInvestOpen(true);
  };

  const handleDeposit = async (amountStr: string) => {
    if (!wallet.publicKey || !investTarget) {
      showToast('Connect Wallet', 'error');
      return;
    }
    setInvestStatus('SIGNING');
    try {
      const parsedAmount = parseFloat(amountStr);
      if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error('Invalid amount');

      const targetAddressStr =
        investTarget.vaultAddress ||
        investTarget.address ||
        investTarget.ownerPubkey ||
        investTarget.creatorAddress ||
        null;
      if (!targetAddressStr) {
        showToast('Vault address not found', 'error');
        setInvestStatus('ERROR');
        setTimeout(() => setInvestStatus('IDLE'), 2000);
        return;
      }

      const targetPubkey = new PublicKey(targetAddressStr.trim());
      const transaction = new Transaction();

      // USDC SPL transfer
      const { ata: fromAta, instruction: createFromIx } = await getOrCreateUsdcAta(
        connection,
        wallet.publicKey,
        wallet.publicKey
      );
      const { ata: toAta, instruction: createToIx } = await getOrCreateUsdcAta(
        connection,
        wallet.publicKey,
        targetPubkey
      );
      if (createFromIx) transaction.add(createFromIx);
      if (createToIx) transaction.add(createToIx);
      transaction.add(createUsdcTransferIx(fromAta, toAta, wallet.publicKey, parsedAmount));

      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = wallet.publicKey;

      if (!wallet.signTransaction) {
        throw new Error('Wallet does not support signing');
      }

      const signedTx = await wallet.signTransaction(transaction);
      setInvestStatus('CONFIRMING');
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
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
      showToast(`Payment confirmed! Processing token transfer...`, 'info');

      setTimeout(() => {
        setInvestStatus('SUCCESS');
        const estimatedReceived = (parsedAmount * 100).toFixed(2);
        showToast(
          `Complete! You received ${estimatedReceived} ${investTarget.ticker || 'ETF'}`,
          'success'
        );

        setTimeout(() => {
          setIsInvestOpen(false);
          setMatchedStrategy(null);
          setTimeout(() => {
            setInvestStatus('IDLE');
            setInvestTarget(null);
          }, 500);
        }, 2000);

        void api
          .syncUserStats(wallet.publicKey!.toBase58(), 0, parsedAmount, investTarget.id)
          .catch(() => {});
      }, 1500);
    } catch (e: any) {
      showToast(e.message || 'Transaction Failed', 'error');
      setInvestStatus('ERROR');
      setTimeout(() => setInvestStatus('IDLE'), 2000);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentStrategy = enrichedStrategies[currentIndex];
      if (!currentStrategy || matchedStrategy) return;
      if (e.key === 'ArrowLeft') handleSwipe('left', currentStrategy);
      else if (e.key === 'ArrowRight') handleSwipe('right', currentStrategy);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, enrichedStrategies, handleSwipe, matchedStrategy]);

  // ★修正: ローディング画面をスケルトンカードに変更
  if (loading) {
    return (
      <div className="relative w-full h-[100dvh] bg-[#030303] overflow-hidden flex flex-col">
        <div className="flex-1 w-full flex items-center justify-center px-4 pb-53 pt-12 md:pb-24 relative">
          <div className="relative w-full max-w-sm h-full max-h-[70vh] md:max-h-[600px] z-10">
            {/* スケルトンを3枚スタック表示 */}
            {[0, 1, 2].map((i) => (
              <SwipeCardSkeleton key={i} index={i} />
            ))}

            {/* 中央のローディングインジケーター */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-50">
              <div className="bg-[#080503]/80 backdrop-blur-xl p-6 rounded-3xl border border-[rgba(184,134,63,0.15)] shadow-2xl flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-[#B8863F] animate-spin mb-3" />
                <p className="text-xs font-bold text-white/50 tracking-widest animate-pulse">
                  SCOUTING GEMS...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentStrategy = enrichedStrategies[currentIndex];

  if (enrichedStrategies.length === 0) {
    return (
      <div className="relative w-full h-[100dvh] bg-[#030303] flex flex-col items-center justify-center p-4">
        <h3 className="text-xl font-bold text-white mb-2">No Strategies Found</h3>
        <p className="text-white/50 text-sm">Create one to get started.</p>
      </div>
    );
  }

  if (currentIndex >= enrichedStrategies.length) {
    return (
      <div className="relative w-full h-[100dvh] bg-[#030303] flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#140E08] rounded-full flex items-center justify-center mx-auto mb-6 border border-[rgba(184,134,63,0.15)]">
            <Sparkles className="w-8 h-8 text-[#B8863F]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">That's all for now!</h3>
          <button
            onClick={() => setCurrentIndex(0)}
            className="px-6 py-3 bg-[#B8863F] text-white font-bold rounded-xl flex items-center gap-2 mx-auto mt-4"
          >
            <RefreshCw className="w-4 h-4" /> Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[100dvh] bg-[#030303] overflow-hidden flex flex-col">
      <AnimatePresence>
        {matchedStrategy && (
          <SuccessOverlay
            strategy={matchedStrategy}
            onClose={handleCloseMatch}
            onGoToStrategy={handleGoToStrategy}
            onBuy={handleBuyFromOverlay}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 w-full flex items-center justify-center px-4 pb-53 pt-12 md:pb-24 relative">
        {/* Left Button (Pass) */}
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => currentStrategy && handleSwipe('left', currentStrategy)}
          disabled={isSwiping}
          className="hidden md:flex absolute left-8 lg:left-20 xl:left-32 z-30 w-16 h-16 rounded-full border border-[rgba(184,134,63,0.15)] bg-[#140E08]/50 backdrop-blur-md text-white/40 hover:text-red-500 hover:border-red-500/50 transition-colors items-center justify-center shadow-lg"
        >
          <X className="w-8 h-8" />
        </motion.button>

        {/* Card Stack */}
        <div className="relative w-full max-w-sm h-full max-h-[70vh] md:max-h-[600px] z-10">
          <AnimatePresence>
            {enrichedStrategies
              .slice(currentIndex, currentIndex + 3)
              .reverse()
              .map((strategy, i) => {
                const stackIndex =
                  enrichedStrategies.slice(currentIndex, currentIndex + 3).length - 1 - i;
                return (
                  <SwipeCard
                    key={strategy.id}
                    index={stackIndex}
                    isTop={stackIndex === 0}
                    strategy={strategy}
                    onSwipeLeft={() => handleSwipe('left', strategy)}
                    onSwipeRight={() => handleSwipe('right', strategy)}
                    onTap={() => onStrategySelect(strategy)}
                    onSwipeDown={onToggleView}
                  />
                );
              })}
          </AnimatePresence>
        </div>

        {/* Right Button (Like) */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => currentStrategy && handleSwipe('right', currentStrategy)}
          disabled={isSwiping}
          className="hidden md:flex absolute right-8 lg:right-20 xl:right-32 z-30 w-16 h-16 rounded-full border border-[rgba(184,134,63,0.15)] bg-[#140E08]/50 backdrop-blur-md text-white/40 hover:text-emerald-400 hover:border-emerald-400/50 transition-colors items-center justify-center shadow-lg"
        >
          <Rocket className="w-8 h-8" />
        </motion.button>
      </div>

      {investTarget && (
        <InvestSheet
          isOpen={isInvestOpen}
          onClose={() => {
            setIsInvestOpen(false);
            setTimeout(() => {
              setInvestStatus('IDLE');
              setInvestTarget(null);
            }, 300);
          }}
          strategy={investTarget}
          onConfirm={handleDeposit}
          status={investStatus}
        />
      )}
    </div>
  );
};
