import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, Copy, ExternalLink, Wallet } from 'lucide-react';

// --- Types (変更なし) ---
interface Token {
  symbol: string;
  weight: number;
  address?: string;
  logoURI?: string | null;
  currentPrice?: number;
  change24h?: number;
}

export interface StrategyCardData {
  id: string;
  name: string;
  ticker?: string;
  type: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  tokens: Token[];
  roi: number;
  tvl: number;
  creatorAddress: string;
  creatorPfpUrl?: string | null;
  description?: string;
  createdAt: number;
  rebalanceType?: string;
  mintAddress?: string;
  vaultAddress?: string;
}

interface SwipeCardProps {
  strategy: StrategyCardData;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
  onSwipeDown?: () => void;
  isTop: boolean;
  index: number;
}

const SWIPE_THRESHOLD = 80;
const DOWN_THRESHOLD = 90;
const ROTATION_RANGE = 12;

// --- Helpers ---
export const formatPrice = (price: any) => {
  const p = Number(price);
  if (isNaN(p) || p === 0) return '$0.00';
  if (p < 0.000001) return '$' + p.toFixed(8);
  if (p < 0.01) return '$' + p.toFixed(6);
  if (p < 1) return '$' + p.toFixed(4);
  return '$' + p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const FormatChange = ({
  value,
  className,
  iconSize = 'w-3 h-3',
}: {
  value: any;
  className?: string;
  iconSize?: string;
}) => {
  const c = Number(value);
  if (isNaN(c) || !isFinite(c))
    return <span className={`font-bold text-white/40 ${className}`}>0.00%</span>;
  const isPositive = c >= 0;
  return (
    <span
      className={`flex items-center justify-center font-bold ${isPositive ? 'text-[#34D399]' : 'text-[#F87171]'} ${className}`}
      style={{
        textShadow: isPositive
          ? '0 0 10px rgba(52, 211, 153, 0.4)'
          : '0 0 10px rgba(248, 113, 113, 0.4)',
      }}
    >
      {isPositive ? (
        <TrendingUp className={`${iconSize} mr-1.5`} />
      ) : (
        <TrendingDown className={`${iconSize} mr-1.5`} />
      )}
      {Math.abs(c).toFixed(2)}%
    </span>
  );
};

export const formatTvl = (value: number): string => {
  if (value < 0.01) return '< 0.01';
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B';
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export const timeAgo = (timestamp: number) => {
  if (!timestamp) return 'Recently';
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  const days = Math.floor(seconds / 86400);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
};

export const TokenIcon = ({
  symbol,
  src,
  address,
  className,
}: {
  symbol: string;
  src?: string | null;
  address?: string;
  className?: string;
}) => {
  const getInitialSrc = () => {
    if (src && src.startsWith('http')) return src;
    if (address) return `https://static.jup.ag/tokens/${address}.png`;
    return `https://jup.ag/tokens/${symbol}.svg`;
  };
  const [imgSrc, setImgSrc] = useState<string>(getInitialSrc());
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    setErrorCount(0);
    setImgSrc(getInitialSrc());
  }, [src, address, symbol]);

  const handleError = () => {
    const nextCount = errorCount + 1;
    setErrorCount(nextCount);
    if (nextCount === 1) {
      if (address)
        setImgSrc(
          `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${address}/logo.png`
        );
      else
        setImgSrc(
          `https://ui-avatars.com/api/?name=${symbol}&background=random&color=fff&size=128&bold=true`
        );
    } else if (nextCount === 2) {
      setImgSrc(
        `https://ui-avatars.com/api/?name=${symbol}&background=random&color=fff&size=128&bold=true`
      );
    }
  };

  return (
    <img src={imgSrc} alt={symbol} className={className} onError={handleError} loading="lazy" />
  );
};

const typeColors: Record<string, string> = {
  AGGRESSIVE:
    'text-amber-200 border-amber-500/30 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
  BALANCED:
    'text-blue-200 border-blue-500/30 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]',
  CONSERVATIVE:
    'text-emerald-200 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
};

// ポートフォリオ配分チャート用カラーパレット
const CHART_COLORS = [
  '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6',
  '#F97316', '#06B6D4', '#EF4444', '#84CC16',
  '#EC4899', '#14B8A6', '#A78BFA', '#FCD34D',
];

// ── SwipeCardBody ──
export const SwipeCardBody = ({
  strategy,
  compact = false,
}: {
  strategy: StrategyCardData;
  compact?: boolean;
}) => {
  const c = compact;
  const maxLogos = c ? 6 : 8;
  const overflow = Math.max(0, strategy.tokens.length - maxLogos);

  return (
    <div
      className="w-full h-full overflow-hidden flex flex-col relative select-none"
      style={{
        borderRadius: c ? '20px' : '32px',
        background: 'linear-gradient(145deg, #0e0e0e 0%, #080808 100%)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.06)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Glossy Reflection */}
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

      {/* --- Header --- */}
      <div className={`${c ? 'p-3 pb-1' : 'p-6 pb-2'} relative z-10`}>
        <div className={`flex justify-between items-start ${c ? 'mb-1.5' : 'mb-3'}`}>
          <div className="min-w-0 flex-1 pr-2">
            <div
              className={`inline-flex items-center rounded-full font-bold uppercase border ${c ? 'px-1.5 py-px text-[8px] mb-1' : 'px-2.5 py-0.5 text-[10px] mb-2'} ${typeColors[strategy.type] || typeColors.BALANCED}`}
            >
              {strategy.type}
            </div>
            <h2
              className={`font-bold text-white leading-tight tracking-tight truncate ${c ? 'text-sm' : 'text-[26px] leading-none drop-shadow-md'}`}
            >
              ${strategy.ticker || strategy.name}
            </h2>
            {strategy.ticker && !c && (
              <p className="text-sm text-white/60 mt-1 font-medium tracking-wide truncate">
                {strategy.name}
              </p>
            )}
          </div>

          {/* PFP */}
          <div className="relative group shrink-0">
            <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div
              className={`rounded-full p-[2px] bg-gradient-to-br from-amber-300/30 to-amber-500/5 relative z-10 shadow-[0_0_10px_rgba(245,158,11,0.2)] ${c ? 'w-8 h-8' : 'w-11 h-11'}`}
            >
              <img
                src={
                  strategy.creatorPfpUrl ||
                  `https://api.dicebear.com/7.x/identicon/svg?seed=${strategy.creatorAddress}`
                }
                alt="Creator"
                className="w-full h-full rounded-full object-cover bg-black/40"
              />
            </div>
          </div>
        </div>

        <p
          className={`text-white/70 leading-relaxed font-light ${c ? 'text-[10px] line-clamp-1' : 'text-[13px] line-clamp-2 min-h-[2.6em]'}`}
        >
          {strategy.description || 'No description provided.'}
        </p>

        <div className={`flex items-center gap-2 ${c ? 'mt-1.5' : 'mt-4 gap-3'}`}>
          <div
            className={`flex items-center rounded-full bg-black/50 border border-white/10 ${c ? 'gap-1 px-1.5 py-0.5' : 'gap-1.5 px-2.5 py-1'}`}
          >
            <span className={`text-white/60 font-mono tracking-wider ${c ? 'text-[8px]' : 'text-[10px]'}`}>
              {strategy.id.slice(0, 4)}...{strategy.id.slice(-4)}
            </span>
            <Copy className={`text-white/40 ${c ? 'w-2 h-2' : 'w-3 h-3'}`} />
          </div>
          <div className={`flex items-center gap-1 text-white/50 font-medium ${c ? 'text-[8px]' : 'text-[11px]'}`}>
            <Clock className={c ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
            {timeAgo(strategy.createdAt)}
          </div>
        </div>
      </div>

      {/* --- Stats --- */}
      <div className={`grid grid-cols-2 relative z-10 ${c ? 'px-3 py-1.5 gap-2' : 'px-6 py-2 gap-3'}`}>
        {/* ROI Card */}
        <div
          className={`col-span-1 rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-inner flex flex-col items-center justify-center relative overflow-hidden group ${c ? 'h-[68px]' : 'h-[100px]'}`}
        >
          <div
            className={`absolute inset-0 opacity-20 bg-gradient-to-br ${strategy.roi >= 0 ? 'from-emerald-500/30 to-transparent' : 'from-red-500/30 to-transparent'}`}
          />
          <span className={`font-bold uppercase tracking-widest mb-0.5 text-white/40 z-10 ${c ? 'text-[8px]' : 'text-[10px]'}`}>
            24h
          </span>
          <FormatChange
            value={strategy.roi}
            className={`drop-shadow-sm z-10 ${c ? 'text-lg' : 'text-3xl'}`}
            iconSize={c ? 'w-4 h-4' : 'w-6 h-6'}
          />
        </div>

        {/* TVL Card */}
        <div
          className={`col-span-1 rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-inner flex flex-col justify-center relative overflow-hidden ${c ? 'h-[68px] px-2.5' : 'h-[100px] px-4'}`}
        >
          <div className={`absolute top-0 right-0 opacity-10 ${c ? 'p-2' : 'p-3'}`}>
            <Wallet className={c ? 'w-8 h-8 text-white' : 'w-12 h-12 text-white'} />
          </div>
          <span className={`text-white/40 uppercase font-bold tracking-widest mb-0.5 z-10 ${c ? 'text-[8px]' : 'text-[10px]'}`}>
            TVL
          </span>
          <div className={`font-bold text-white tracking-tight z-10 drop-shadow-sm leading-none ${c ? 'text-base' : 'text-2xl'}`}>
            {formatTvl(strategy.tvl)}
          </div>
          {!c && <span className="text-[9px] text-white/30 z-10">USDC</span>}
        </div>
      </div>

      {/* --- Composition: 重なりロゴ + 配分チップ --- */}
      <div className={`flex-1 overflow-hidden flex flex-col relative z-10 ${c ? 'px-3 py-1.5' : 'px-6 py-3'}`}>
        {/* セクションヘッダー */}
        <div className={`flex items-center justify-between ${c ? 'mb-2' : 'mb-3'}`}>
          <span className={`font-bold text-white/40 uppercase tracking-widest flex items-center gap-1 ${c ? 'text-[8px]' : 'text-[11px]'}`}>
            <div className="w-1 h-1 rounded-full bg-amber-400/50" /> Assets
          </span>
          <span className={`px-1.5 py-px rounded-full bg-white/10 text-white/60 border border-white/5 ${c ? 'text-[8px]' : 'text-[10px] px-2 py-0.5'}`}>
            {strategy.tokens.length}
          </span>
        </div>

        {/* 重なりロゴ */}
        <div className={`flex items-center ${c ? 'mb-2' : 'mb-3'}`}>
          {strategy.tokens.slice(0, maxLogos).map((token, i) => (
            <div
              key={i}
              className={`rounded-full bg-black/80 overflow-hidden flex-none border-2 shadow-lg ${c ? 'w-7 h-7' : 'w-10 h-10'}`}
              style={{
                marginLeft: i > 0 ? (c ? '-8px' : '-10px') : '0',
                zIndex: maxLogos - i,
                borderColor: CHART_COLORS[i % CHART_COLORS.length],
              }}
            >
              <TokenIcon
                symbol={token.symbol}
                src={token.logoURI}
                address={token.address}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          ))}
          {overflow > 0 && (
            <div
              className={`rounded-full bg-white/5 border-2 border-white/15 flex items-center justify-center flex-none ${c ? 'w-7 h-7' : 'w-10 h-10'}`}
              style={{ marginLeft: c ? '-8px' : '-10px', zIndex: 0 }}
            >
              <span className={`text-white/50 font-bold ${c ? 'text-[7px]' : 'text-[9px]'}`}>
                +{overflow}
              </span>
            </div>
          )}
        </div>

        {/* 配分チップ */}
        <div className="flex flex-wrap gap-1 overflow-hidden">
          {strategy.tokens.slice(0, maxLogos).map((token, i) => (
            <div
              key={i}
              className={`flex items-center gap-1 rounded-full bg-white/5 border border-white/5 ${c ? 'px-1.5 py-0.5' : 'px-2 py-0.5'}`}
            >
              <span
                className={`rounded-full flex-none ${c ? 'w-1 h-1' : 'w-1.5 h-1.5'}`}
                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className={`font-bold text-white/70 ${c ? 'text-[7px]' : 'text-[9px]'}`}>
                {token.symbol}
              </span>
              <span
                className={`font-bold ${c ? 'text-[7px]' : 'text-[9px]'}`}
                style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
              >
                {token.weight}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* --- Footer --- */}
      <div className={`mt-auto flex justify-center border-t border-white/5 bg-gradient-to-t from-black/40 to-transparent ${c ? 'p-2' : 'p-3'}`}>
        <a
          href={`https://solscan.io/token/${strategy.mintAddress || strategy.id}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`text-white/30 font-mono hover:text-white/80 flex items-center gap-1 transition-all duration-300 ${c ? 'text-[8px]' : 'text-[10px] gap-1.5'}`}
        >
          Mint:{' '}
          <span className="underline decoration-white/20 underline-offset-2">
            {(strategy.mintAddress || strategy.id).slice(0, 8)}...
          </span>{' '}
          <ExternalLink className={c ? 'w-2 h-2' : 'w-2.5 h-2.5'} />
        </a>
      </div>
    </div>
  );
};

// --- Main Component ---
export const SwipeCard = ({
  strategy,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  onSwipeDown,
  isTop,
  index,
}: SwipeCardProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-ROTATION_RANGE, ROTATION_RANGE]);
  const cardOpacity = useTransform(x, [-400, -200, 0, 200, 400], [0, 1, 1, 1, 0]);
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  // 下ドラッグ時に縮小 + インジケーター表示
  const downScale = useTransform(y, [0, 300], [1, 0.78]);
  const downIndicatorOpacity = useTransform(y, [40, 110], [0, 1]);

  const isDragging = useRef(false);
  const swiped = useRef(false);

  const handleDragStart = () => {
    isDragging.current = true;
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (swiped.current) return;

    const { offset, velocity } = info;
    const isVertical = Math.abs(offset.y) > Math.abs(offset.x);

    // 下スワイプ判定（縦方向が支配的 & 下方向）
    if (isVertical && (offset.y > DOWN_THRESHOLD || (offset.y > 50 && velocity.y > 400))) {
      swiped.current = true;
      animate(y, window.innerHeight * 0.8, {
        type: 'spring',
        stiffness: 200,
        damping: 25,
        velocity: velocity.y,
      }).then(() => onSwipeDown?.());
      return;
    }

    // y を元に戻す
    animate(y, 0, { type: 'spring', stiffness: 500, damping: 28 });

    const swipeRight = !isVertical && (offset.x > SWIPE_THRESHOLD || velocity.x > 600);
    const swipeLeft = !isVertical && (offset.x < -SWIPE_THRESHOLD || velocity.x < -600);

    if (swipeRight) {
      swiped.current = true;
      const flyTo = Math.max(window.innerWidth, 500);
      animate(x, flyTo, { type: 'spring', stiffness: 600, damping: 40, velocity: velocity.x }).then(
        () => onSwipeRight()
      );
    } else if (swipeLeft) {
      swiped.current = true;
      const flyTo = -Math.max(window.innerWidth, 500);
      animate(x, flyTo, { type: 'spring', stiffness: 600, damping: 40, velocity: velocity.x }).then(
        () => onSwipeLeft()
      );
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 28 });
    }
    setTimeout(() => {
      isDragging.current = false;
    }, 150);
  };

  const handleClick = () => {
    if (!isDragging.current && !swiped.current && isTop) onTap();
  };

  return (
    <motion.div
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      style={{
        x: isTop ? x : 0,
        y: isTop ? y : index * 12,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? cardOpacity : 1,
        scale: isTop ? downScale : 1 - index * 0.05,
        zIndex: 100 - index,
        willChange: 'transform',
      }}
      drag={isTop ? true : false}
      dragDirectionLock
      dragMomentum={false}
      onDragStart={isTop ? handleDragStart : undefined}
      onDragEnd={isTop ? handleDragEnd : undefined}
      onClick={handleClick}
      initial={false}
      animate={isTop ? undefined : { scale: 1 - index * 0.05, y: index * 12 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* Card Body */}
      <SwipeCardBody strategy={strategy} />

      {/* Swipe Indicators (top card only) */}
      {isTop && (
        <>
          <motion.div
            className="absolute top-12 left-8 z-50 border-[3px] border-[#34D399] text-[#34D399] font-black text-3xl px-4 py-2 rounded-2xl transform -rotate-12 bg-black/80 pointer-events-none"
            style={{ opacity: likeOpacity }}
          >
            LIKE
          </motion.div>
          <motion.div
            className="absolute top-12 right-8 z-50 border-[3px] border-[#F87171] text-[#F87171] font-black text-3xl px-4 py-2 rounded-2xl transform rotate-12 bg-black/80 pointer-events-none"
            style={{ opacity: nopeOpacity }}
          >
            PASS
          </motion.div>
          {/* 下スワイプ → リスト表示インジケーター */}
          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1.5 pointer-events-none"
            style={{ opacity: downIndicatorOpacity }}
          >
            <div className="bg-black/80 border border-white/20 rounded-full px-4 py-1.5 text-white/80 text-xs font-bold tracking-widest">
              ↓ LIST
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
};
