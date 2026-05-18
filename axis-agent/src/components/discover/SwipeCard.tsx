import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, Copy, ExternalLink, Wallet } from 'lucide-react';

// --- Types ---
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
  // Performance data — populated by API once ready
  performanceData?: PerformancePoint[];
}

export interface PerformancePoint {
  timestamp: number; // unix seconds
  nav: number;       // NAV value
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
    return <span className={`font-normal text-white/40 ${className}`}>0.00%</span>;
  const isPositive = c >= 0;
  return (
    <span
      className={`flex items-center justify-center font-normal ${isPositive ? 'text-[#34D399]' : 'text-[#F87171]'} ${className}`}
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
    'text-amber-200 border-amber-500/30 bg-amber-500/10 shadow-[0_0_15px_rgba(201,168,76,0.2)]',
  BALANCED:
    'text-blue-200 border-blue-500/30 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]',
  CONSERVATIVE:
    'text-emerald-200 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_15px_rgba(48,164,108,0.2)]',
};

// ─────────────────────────────────────────────
// NAV Performance Chart
// ─────────────────────────────────────────────

/** Generate plausible mock NAV data (replace with real API response) */
function generateMockData(points = 60, seed = 1): PerformancePoint[] {
  const now = Math.floor(Date.now() / 1000);
  const interval = 3600; // 1h candles
  let nav = 100 + seed * 12;
  const result: PerformancePoint[] = [];
  for (let i = points - 1; i >= 0; i--) {
    nav += (Math.random() - 0.46) * nav * 0.018;
    result.push({ timestamp: now - i * interval, nav: Math.max(nav, 1) });
  }
  return result;
}

type ChartRange = '1H' | '24H' | '7D' | '30D';

const RANGE_LABELS: ChartRange[] = ['1H', '24H', '7D', '30D'];

/**
 * PerformanceChart
 *
 * Props:
 *   data        — real PerformancePoint[] from your API, or undefined (shows mock)
 *   compact     — smaller layout flag
 *   seedOffset  — integer to vary mock curves per card
 */
export const PerformanceChart = ({
  data,
  compact = false,
  seedOffset = 0,
}: {
  data?: PerformancePoint[];
  compact?: boolean;
  seedOffset?: number;
}) => {
  const [range, setRange] = useState<ChartRange>('24H');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Mock data keyed by range (lengths vary to simulate different granularities)
  const mockByRange: Record<ChartRange, PerformancePoint[]> = {
    '1H':  generateMockData(60, seedOffset + 1),
    '24H': generateMockData(96, seedOffset + 2),
    '7D':  generateMockData(84, seedOffset + 3),
    '30D': generateMockData(90, seedOffset + 4),
  };

  const points = data ?? mockByRange[range];

  const navValues = points.map((p) => p.nav);
  const minNav = Math.min(...navValues);
  const maxNav = Math.max(...navValues);
  const navRange = maxNav - minNav || 1;

  const firstNav = points[0]?.nav ?? 0;
  const lastNav = points[points.length - 1]?.nav ?? 0;
  const change = firstNav > 0 ? ((lastNav - firstNav) / firstNav) * 100 : 0;
  const isPositive = change >= 0;
  const accentColor = isPositive ? '#34D399' : '#F87171';
  const accentGlow = isPositive ? 'rgba(52,211,153,0.35)' : 'rgba(248,113,113,0.35)';

  // SVG path helpers
  const W = 400;
  const H = compact ? 64 : 100;
  const PAD_X = 0;
  const PAD_Y = 8;

  const toX = (i: number) => PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2);
  const toY = (nav: number) =>
    PAD_Y + (1 - (nav - minNav) / navRange) * (H - PAD_Y * 2);

  // Smooth cubic bezier path
  const buildPath = () => {
    if (points.length < 2) return '';
    let d = `M ${toX(0)} ${toY(points[0].nav)}`;
    for (let i = 1; i < points.length; i++) {
      const x0 = toX(i - 1), y0 = toY(points[i - 1].nav);
      const x1 = toX(i), y1 = toY(points[i].nav);
      const cpx = (x0 + x1) / 2;
      d += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  };

  const buildAreaPath = () => {
    const line = buildPath();
    if (!line) return '';
    const lastX = toX(points.length - 1);
    const firstX = toX(0);
    return `${line} L ${lastX} ${H} L ${firstX} ${H} Z`;
  };

  const linePath = buildPath();
  const areaPath = buildAreaPath();

  // Hover interaction
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round((relX / W) * (points.length - 1));
    setHoverIdx(Math.max(0, Math.min(points.length - 1, idx)));
  };

  // Format hover price label
  const hoverPoint = hoverIdx !== null ? points[hoverIdx] : null;
  const hoverX = hoverIdx !== null ? toX(hoverIdx) : null;
  const hoverY = hoverIdx !== null ? toY(points[hoverIdx].nav) : null;

  // Animate line draw on mount / range change
  useEffect(() => {
    setAnimated(false);
    const t = setTimeout(() => setAnimated(true), 30);
    return () => clearTimeout(t);
  }, [range, data]);

  return (
    <div className="w-full flex flex-col">
      {/* Range selector + change badge */}
      <div className={`flex items-center justify-between ${compact ? 'mb-1.5' : 'mb-2'}`}>
        <div className="flex items-center gap-1">
          {RANGE_LABELS.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md font-mono transition-all duration-200 ${
                compact ? 'text-[8px] px-1.5 py-0.5' : 'text-[9px] px-2 py-1'
              } ${
                range === r
                  ? 'bg-white/15 text-white'
                  : 'text-white/30 hover:text-white/60'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div
          className={`flex items-center gap-1 font-mono rounded-full px-2 py-0.5 border ${
            compact ? 'text-[8px]' : 'text-[10px]'
          }`}
          style={{
            color: accentColor,
            borderColor: accentColor + '40',
            background: accentColor + '12',
            textShadow: `0 0 8px ${accentGlow}`,
          }}
        >
          {isPositive ? (
            <TrendingUp className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          ) : (
            <TrendingDown className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          )}
          {Math.abs(change).toFixed(2)}%
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full" style={{ height: compact ? 68 : 108 }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={`area-grad-${seedOffset}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </linearGradient>
            <filter id={`line-glow-${seedOffset}`}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feFlood floodColor={accentColor} floodOpacity="0.6" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Clip path for draw animation */}
            <clipPath id={`clip-draw-${seedOffset}`}>
              <motion.rect
                x="0" y="0" height={H}
                initial={{ width: 0 }}
                animate={{ width: animated ? W : 0 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            </clipPath>
          </defs>

          {/* Horizontal grid lines */}
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={t}
              x1={0} y1={PAD_Y + t * (H - PAD_Y * 2)}
              x2={W} y2={PAD_Y + t * (H - PAD_Y * 2)}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
          ))}

          {/* Area fill (clipped) */}
          <g clipPath={`url(#clip-draw-${seedOffset})`}>
            <path d={areaPath} fill={`url(#area-grad-${seedOffset})`} />
          </g>

          {/* Line (clipped + glow) */}
          <g clipPath={`url(#clip-draw-${seedOffset})`}>
            <path
              d={linePath}
              fill="none"
              stroke={accentColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              filter={`url(#line-glow-${seedOffset})`}
            />
          </g>

          {/* Hover crosshair */}
          {hoverIdx !== null && hoverX !== null && hoverY !== null && (
            <>
              <line
                x1={hoverX} y1={0} x2={hoverX} y2={H}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
                strokeDasharray="2 3"
              />
              <circle cx={hoverX} cy={hoverY} r="3" fill={accentColor} stroke="#0e0e0e" strokeWidth="1.5" />
            </>
          )}
        </svg>

        {/* Hover price tooltip */}
        {hoverPoint && hoverX !== null && (
          <div
            className="absolute pointer-events-none -translate-y-full -translate-x-1/2"
            style={{
              left: `${(hoverX / W) * 100}%`,
              top: `${((hoverY ?? 0) / H) * 100}%`,
              transform: 'translateX(-50%) translateY(-110%)',
            }}
          >
            <div
              className="rounded-md px-2 py-1 text-[9px] font-mono whitespace-nowrap border"
              style={{
                background: '#0e0e0e',
                color: accentColor,
                borderColor: accentColor + '30',
                boxShadow: `0 0 8px ${accentGlow}`,
              }}
            >
              {hoverPoint.nav.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Bottom: first / last NAV labels */}
      {!compact && (
        <div className="flex justify-between mt-1">
          <span className="text-[9px] font-mono text-white/20">{firstNav.toFixed(2)}</span>
          <span className="text-[9px] font-mono text-white/20">{lastNav.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// SwipeCardBody (with chart injected between stats and composition)
// ─────────────────────────────────────────────
export const SwipeCardBody = ({
  strategy,
  compact = false,
}: {
  strategy: StrategyCardData;
  compact?: boolean;
}) => {
  const c = compact;
  const maxLogos = c ? 6 : 8;
  const sortedTokens = [...strategy.tokens].sort((a, b) => b.weight - a.weight);
  const overflow = Math.max(0, sortedTokens.length - maxLogos);
  // Derive a seed from the strategy id for deterministic mock curves
  const seedOffset = strategy.id.charCodeAt(0) + strategy.id.charCodeAt(strategy.id.length - 1);

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
              className={`inline-flex items-center rounded-full font-normal uppercase border ${c ? 'px-1.5 py-px text-[8px] mb-1' : 'px-2.5 py-0.5 text-[10px] mb-2'} ${typeColors[strategy.type] || typeColors.BALANCED}`}
            >
              {strategy.type}
            </div>
            <h2
              className={`font-normal text-white leading-tight tracking-tight truncate ${c ? 'text-sm' : 'text-[26px] leading-none drop-shadow-md'}`}
            >
              ${strategy.ticker || strategy.name}
            </h2>
            {strategy.ticker && !c && (
              <p className="text-sm text-white/60 mt-1 font-normal tracking-wide truncate">
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
          <div className={`flex items-center gap-1 text-white/50 font-normal ${c ? 'text-[8px]' : 'text-[11px]'}`}>
            <Clock className={c ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
            {timeAgo(strategy.createdAt)}
          </div>
        </div>
      </div>

      {/* ── Performance Chart ─────────────────────── */}
      <div
        className={`relative z-10 ${c ? 'px-3 py-1' : 'px-6 py-2'}`}
        style={{
          background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.015) 50%, transparent)',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {/* Section label */}
        <div className={`flex items-center gap-1 ${c ? 'mb-1' : 'mb-2'}`}>
          <span className={`text-white/30 uppercase font-normal tracking-widest ${c ? 'text-[7px]' : 'text-[9px]'}`}>
            NAV Performance
          </span>
          {/* "LIVE" dot — swap to green once real API is wired */}
          <span className="w-1.5 h-1.5 rounded-full bg-white/20 inline-block" title="Mock data" />
        </div>
        <PerformanceChart
          data={strategy.performanceData} // undefined → shows mock
          compact={c}
          seedOffset={seedOffset}
        />
      </div>

      {/* --- Stats: 24H Change + TVL --- */}
      <div className={`relative z-10 ${c ? 'px-3 py-1.5' : 'px-6 py-2'}`}>
        <div className="grid grid-cols-2 gap-2">
          {/* 24H Change */}
          {(() => {
            const roi = strategy.roi ?? 0;
            const roiPositive = roi >= 0;
            const roiColor = roiPositive ? '#34D399' : '#F87171';
            const roiGlow = roiPositive ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)';
            return (
              <div
                className={`rounded-2xl border bg-[#0a0a0a] shadow-inner flex flex-col justify-center relative overflow-hidden ${c ? 'h-[48px] px-3' : 'h-[60px] px-4'}`}
                style={{ borderColor: roiColor + '25' }}
              >
                <div className="absolute inset-0 opacity-5" style={{ background: roiColor }} />
                <span className={`text-white/40 uppercase font-normal tracking-widest mb-0.5 ${c ? 'text-[8px]' : 'text-[10px]'}`}>
                  24H Change
                </span>
                <div
                  className={`font-normal tracking-tight leading-none flex items-center gap-1 ${c ? 'text-sm' : 'text-xl'}`}
                  style={{ color: roiColor, textShadow: `0 0 10px ${roiGlow}` }}
                >
                  {roiPositive
                    ? <TrendingUp className={c ? 'w-3 h-3' : 'w-4 h-4'} />
                    : <TrendingDown className={c ? 'w-3 h-3' : 'w-4 h-4'} />}
                  {Math.abs(roi).toFixed(2)}%
                </div>
              </div>
            );
          })()}

          {/* TVL */}
          <div
            className={`rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-inner flex flex-col justify-center relative overflow-hidden ${c ? 'h-[48px] px-3' : 'h-[60px] px-4'}`}
          >
            <div className={`absolute top-0 right-0 opacity-10 ${c ? 'p-1.5' : 'p-2'}`}>
              <Wallet className={c ? 'w-6 h-6 text-white' : 'w-8 h-8 text-white'} />
            </div>
            <span className={`text-white/40 uppercase font-normal tracking-widest mb-0.5 ${c ? 'text-[8px]' : 'text-[10px]'}`}>
              TVL
            </span>
            <div className={`font-normal text-white tracking-tight leading-none ${c ? 'text-sm' : 'text-xl'}`}>
              {formatTvl(strategy.tvl)}
              {!c && <span className="text-[10px] text-white/30 ml-1">USDC</span>}
            </div>
          </div>
        </div>
      </div>

      {/* --- Composition --- */}
      <div className={`flex-1 overflow-hidden flex flex-col relative z-20 ${c ? 'px-3 py-1.5' : 'px-6 py-2'}`}>
        <div className={`flex items-center justify-between ${c ? 'mb-2' : 'mb-2'}`}>
          <span className={`font-normal text-white/40 uppercase tracking-widest flex items-center gap-1 ${c ? 'text-[8px]' : 'text-[11px]'}`}>
            <div className="w-1 h-1 rounded-full bg-white/50" /> Assets
          </span>
          <span className={`px-1.5 py-px rounded-full bg-white/10 text-white/60 border border-white/5 ${c ? 'text-[8px]' : 'text-[10px] px-2 py-0.5'}`}>
            {strategy.tokens.length}
          </span>
        </div>

        <div className={`grid grid-cols-2 ${c ? 'gap-1.5' : 'gap-1.5'} overflow-y-auto pr-1 pb-1 scrollbar-hide flex-1 min-h-0`}>
          {(() => {
            const maxWeight = Math.max(...sortedTokens.map((t) => t.weight));
            return sortedTokens.slice(0, maxLogos).map((token, i) => {
              const relativeFill = (token.weight / maxWeight) * 100;
              return (
                <div
                  key={i}
                  className={`relative overflow-hidden bg-[#0a0a0a] border border-white/5 flex items-center ${c ? 'rounded-lg p-1' : 'rounded-xl p-1.5'}`}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${relativeFill}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.05 }}
                    className="absolute left-0 top-0 bottom-0 bg-white/10"
                  />
                  <div className="relative z-10 flex items-center justify-between w-full px-1">
                    <div className="flex items-center gap-1.5">
                      <TokenIcon
                        symbol={token.symbol}
                        src={token.logoURI}
                        address={token.address}
                        className={`rounded-full bg-black/50 ${c ? 'w-4 h-4' : 'w-5 h-5'}`}
                      />
                      <span className={`font-normal text-white/90 tracking-wide ${c ? 'text-[8px]' : 'text-[10px]'}`}>
                        {token.symbol}
                      </span>
                    </div>
                    <span className={`font-mono text-white/60 ${c ? 'text-[8px]' : 'text-[10px]'}`}>
                      {token.weight}%
                    </span>
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {overflow > 0 && (
          <div className="mt-1.5 text-center">
            <span className={`text-white/30 font-normal tracking-widest ${c ? 'text-[7px]' : 'text-[9px]'}`}>
              + {overflow} MORE ASSETS
            </span>
          </div>
        )}
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

// --- SwipeCard (unchanged logic, uses updated SwipeCardBody) ---
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
  const downScale = useTransform(y, [0, 300], [1, 0.78]);
  const downIndicatorOpacity = useTransform(y, [40, 110], [0, 1]);

  const isDragging = useRef(false);
  const swiped = useRef(false);
  const prevIndexRef = useRef(index);

  useEffect(() => {
    const prevIdx = prevIndexRef.current;
    prevIndexRef.current = index;
    if (index === 0 && prevIdx > 0) {
      y.set(prevIdx * 14);
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }, [index, y]);

  const handleDragStart = () => { isDragging.current = true; };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (swiped.current) return;
    const { offset, velocity } = info;
    const isVertical = Math.abs(offset.y) > Math.abs(offset.x);

    if (isVertical && (offset.y > DOWN_THRESHOLD || (offset.y > 50 && velocity.y > 400))) {
      swiped.current = true;
      onSwipeDown?.();
      animate(y, window.innerHeight * 0.8, { type: 'spring', stiffness: 200, damping: 25, velocity: velocity.y });
      return;
    }

    animate(y, 0, { type: 'spring', stiffness: 500, damping: 28 });

    const swipeRight = !isVertical && (offset.x > SWIPE_THRESHOLD || velocity.x > 600);
    const swipeLeft = !isVertical && (offset.x < -SWIPE_THRESHOLD || velocity.x < -600);

    if (swipeRight) {
      swiped.current = true;
      onSwipeRight();
      animate(x, Math.max(window.innerWidth, 500), { type: 'spring', stiffness: 600, damping: 40, velocity: velocity.x });
    } else if (swipeLeft) {
      swiped.current = true;
      onSwipeLeft();
      animate(x, -Math.max(window.innerWidth, 500), { type: 'spring', stiffness: 600, damping: 40, velocity: velocity.x });
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 28 });
    }
    setTimeout(() => { isDragging.current = false; }, 150);
  };

  const handleClick = () => { void onTap; };

  const deckRotate = index === 1 ? -2 : index === 2 ? 3 : 0;

  return (
    <motion.div
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      style={{
        x: isTop ? x : 0,
        y: isTop ? y : index * 14,
        rotate: isTop ? rotate : deckRotate,
        opacity: isTop ? cardOpacity : 1,
        scale: isTop ? downScale : 1 - index * 0.05,
        zIndex: 100 - index,
        willChange: 'transform',
      }}
      drag={isTop ? true : false}
      dragMomentum={false}
      onDragStart={isTop ? handleDragStart : undefined}
      onDragEnd={isTop ? handleDragEnd : undefined}
      onClick={handleClick}
      initial={false}
      animate={isTop ? undefined : { scale: 1 - index * 0.05, y: index * 14, rotate: deckRotate }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
    >
      <SwipeCardBody strategy={strategy} />

      {isTop && (
        <>
          <motion.div
            className="absolute top-12 left-8 z-50 border-[3px] border-[#34D399] text-[#34D399] font-normal text-3xl px-4 py-2 rounded-2xl transform -rotate-12 bg-black/80 pointer-events-none"
            style={{ opacity: likeOpacity }}
          >
            LIKE
          </motion.div>
          <motion.div
            className="absolute top-12 right-8 z-50 border-[3px] border-[#F87171] text-[#F87171] font-normal text-3xl px-4 py-2 rounded-2xl transform rotate-12 bg-black/80 pointer-events-none"
            style={{ opacity: nopeOpacity }}
          >
            PASS
          </motion.div>
          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1.5 pointer-events-none"
            style={{ opacity: downIndicatorOpacity }}
          >
            <div className="bg-black/80 border border-white/20 rounded-full px-4 py-1.5 text-white/80 text-xs font-normal tracking-widest">
              ↓ LIST
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
};