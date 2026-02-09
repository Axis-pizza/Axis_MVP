import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo, AnimatePresence } from 'framer-motion';
import { Clock, Copy, ExternalLink, Wallet, CheckCircle2 } from 'lucide-react';

// --- Types ---
interface Token {
  symbol: string;
  weight: number;
  address?: string;
  logoURI?: string | null;
  currentPrice?: number;
  change24h?: number; 
}

interface StrategyCardData {
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
}

interface SwipeCardProps {
  strategy: StrategyCardData;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
  isTop: boolean;
  index: number;
}

// --- Constants ---
const SWIPE_THRESHOLD = 100;
const ROTATION_RANGE = 15;

// --- Helper: Generate realistic chart path from change % ---
const generateChartPath = (change24h: number, id: string): string => {
  // Seed from strategy id for consistent chart per card
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed = ((seed << 5) - seed + id.charCodeAt(i)) | 0;
  const seededRandom = (i: number) => {
    const x = Math.sin(seed + i * 127.1) * 43758.5453;
    return x - Math.floor(x);
  };

  const points = 12;
  const width = 200;
  const height = 60;
  const padding = 6;
  const usableH = height - padding * 2;

  // Build y values that trend with change24h
  const trend = Math.max(-30, Math.min(30, change24h)); // clamp
  const yValues: number[] = [];
  let y = usableH * 0.5;
  for (let i = 0; i < points; i++) {
    const noise = (seededRandom(i) - 0.5) * usableH * 0.35;
    const drift = (-trend / 100) * usableH * (i / (points - 1));
    y = Math.max(padding, Math.min(height - padding, usableH * 0.5 + drift + noise));
    yValues.push(y);
  }

  // Smooth cubic bezier path
  const step = width / (points - 1);
  let d = `M0,${yValues[0]}`;
  for (let i = 1; i < points; i++) {
    const x0 = (i - 1) * step;
    const x1 = i * step;
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${yValues[i - 1]} ${cx},${yValues[i]} ${x1},${yValues[i]}`;
  }
  return d;
};

// --- Sub-Component: Glowing Line Chart ---
const MiniChart = ({ change24h, strategyId }: { change24h: number; strategyId: string }) => {
  const color = "#10B981";
  const linePath = generateChartPath(change24h, strategyId);
  const fillPath = `${linePath} V60 H0 Z`;
  const filterId = `glow-${strategyId.slice(0, 8)}`;
  const gradId = `grad-${strategyId.slice(0, 8)}`;

  return (
    <div className="relative w-full h-28 overflow-visible">
      <svg viewBox="0 0 200 60" className="w-full h-full overflow-visible">
        <defs>
          <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Glow layer (extra bright behind) */}
        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          opacity={0.25}
          filter={`url(#${filterId})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        {/* Fill area */}
        <motion.path
          d={fillPath}
          fill={`url(#${gradId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
        {/* Main line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          filter={`url(#${filterId})`}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
};

// --- Helper: Token Icon ---
const TokenIcon = ({ symbol, address, src, className }: { symbol: string, address?: string, src?: string | null, className?: string }) => {
  const [imgSrc, setImgSrc] = useState(src || `https://static.jup.ag/tokens/${address}.png`);
  return (
    <img 
      src={imgSrc} 
      alt={symbol} 
      className={className}
      onError={() => setImgSrc(`https://ui-avatars.com/api/?name=${symbol}&background=random&color=fff`)}
    />
  );
};

// --- Helpers ---
const timeAgo = (timestamp: number) => {
  if (!timestamp) return 'Recently';
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  const days = Math.floor(seconds / 86400);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) return `${hours}h ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

// --- Main Component ---
export const SwipeCard = ({ 
  strategy, 
  onSwipeLeft, 
  onSwipeRight, 
  onTap,
  isTop,
  index 
}: SwipeCardProps) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-ROTATION_RANGE, ROTATION_RANGE]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);

  const [liveNav, setLiveNav] = useState(0);
  const [liveRoi, setLiveRoi] = useState(strategy.roi);
  const [copied, setCopied] = useState(false);
  const isDragging = useRef(false);

  // --- Real-time DexScreener Fetching ---
  useEffect(() => {
    if (!isTop) return;
    
    const fetchLiveStats = async () => {
      const addresses = strategy.tokens.map(t => t.address).filter(Boolean);
      if (addresses.length === 0) return;

      try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addresses.join(',')}`);
        const data = await res.json();
        
        const priceMap: Record<string, number> = {};
        const changeMap: Record<string, number> = {};

        data.pairs?.forEach((pair: any) => {
          const addr = pair.baseToken.address;
          if (!priceMap[addr]) {
            priceMap[addr] = parseFloat(pair.priceUsd);
            changeMap[addr] = parseFloat(pair.priceChange.h24);
          }
        });

        let currentNav = 0;
        let weightedChange = 0;

        strategy.tokens.forEach(t => {
          const price = priceMap[t.address || ''] || t.currentPrice || 0;
          const change = changeMap[t.address || ''] || t.change24h || 0;
          currentNav += price * (t.weight / 100);
          weightedChange += change * (t.weight / 100);
        });

        setLiveNav(currentNav);
        setLiveRoi(weightedChange);
      } catch (e) {
        console.error("DexScreener Error:", e);
      }
    };

    fetchLiveStats();
    const timer = setInterval(fetchLiveStats, 15000);
    return () => clearInterval(timer);
  }, [strategy.tokens, isTop]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(strategy.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPositive = liveRoi >= 0;

  return (
    <motion.div
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? opacity : 1,
        scale: 1 - index * 0.05,
        zIndex: 100 - index,
        y: index * 12, 
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragStart={() => (isDragging.current = true)}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_THRESHOLD) onSwipeRight();
        else if (info.offset.x < -SWIPE_THRESHOLD) onSwipeLeft();
        setTimeout(() => (isDragging.current = false), 200);
      }}
      onClick={() => !isDragging.current && isTop && onTap()}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1 - index * 0.05, opacity: 1, y: index * 12 }}
    >
      {/* ====== PFP: カード外にはみ出す ====== */}
      <div className="absolute -top-6 -left-3 z-50">
        <div className="relative">
          <img 
            src={strategy.creatorPfpUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${strategy.creatorAddress}`} 
            className="w-14 h-14 rounded-full border-[3px] border-[#0C0C0E] object-cover bg-black shadow-lg shadow-black/50"
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-yellow-500 rounded-full border-2 border-[#0C0C0E] flex items-center justify-center">
            <CheckCircle2 className="w-3 h-3 text-black stroke-[3px]" />
          </div>
        </div>
      </div>

      <div className="w-full h-full bg-[#0C0C0E] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col relative select-none">
        
        {/* 背景の環境光 (Neon Glow) */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[100px] bg-emerald-500/20" />

        {/* Swipe Indicators */}
        <AnimatePresence>
          {isTop && (
            <>
              <motion.div style={{ opacity: likeOpacity }} className="absolute top-16 left-8 z-50 border-[4px] border-emerald-500 text-emerald-500 font-black text-3xl px-4 py-1 rounded-xl -rotate-12 pointer-events-none">LIKE</motion.div>
              <motion.div style={{ opacity: nopeOpacity }} className="absolute top-16 right-8 z-50 border-[4px] border-red-500 text-red-500 font-black text-3xl px-4 py-1 rounded-xl rotate-12 pointer-events-none">PASS</motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ====== Header: $TICKER大きく + name + description ====== */}
        <div className="pt-8 px-6 pb-2 z-10">
          {/* $TICKER — 一番大きく目立つ */}
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-4xl font-black text-white tracking-tight leading-none">
              ${strategy.ticker || strategy.tokens[0]?.symbol || 'TOKEN'}
            </h1>
            <div className={`px-4 py-2 rounded-xl font-black text-lg border transition-colors ${
              isPositive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {isPositive ? '▲' : '▼'} {Math.abs(liveRoi).toFixed(2)}%
            </div>
          </div>

          {/* Strategy name + type */}
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-white/60">{strategy.name}</h2>
            <span className="text-white/20">·</span>
            <span className="text-white/20 text-[10px] font-mono tracking-tighter uppercase">{strategy.type}</span>
          </div>

          {/* Description (三本線に相当) */}
          {strategy.description && (
            <p className="text-xs text-white/30 mt-2 line-clamp-2 leading-relaxed">{strategy.description}</p>
          )}
        </div>

        {/* ====== Center: Chart ====== */}
        <div className="px-6 flex-1 flex flex-col justify-center z-10">
          <MiniChart change24h={liveRoi} strategyId={strategy.id} />
        </div>

        {/* ====== Footer: Token Icons (左) + Price & Time (右) + CA Bar ====== */}
        <div className="px-6 pb-5 z-10 space-y-4">
          {/* Token Icons + Price/Time row */}
          <div className="flex justify-between items-end">
            {/* Left: Token icons */}
            <div className="space-y-1.5">
              <div className="flex -space-x-2.5">
                {strategy.tokens.slice(0, 5).map((token, i) => (
                  <TokenIcon 
                    key={i}
                    symbol={token.symbol} 
                    address={token.address}
                    src={token.logoURI}
                    className="w-8 h-8 rounded-full border-2 border-[#0C0C0E] relative hover:z-20 transition-all cursor-pointer"
                  />
                ))}
                {strategy.tokens.length > 5 && (
                  <div className="w-8 h-8 rounded-full border-2 border-[#0C0C0E] bg-[#1c1c1e] flex items-center justify-center text-[10px] font-bold text-white/40">
                    +{strategy.tokens.length - 5}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Price + Time */}
            <div className="text-right space-y-1">
              <div className="text-2xl font-black text-white tracking-tight">
                {liveNav > 0 ? `$${liveNav.toFixed(2)}` : '---'}
              </div>
              <div className="flex items-center justify-end gap-1.5 text-[11px] text-white/40 font-medium">
                <Clock className="w-3 h-3" /> {timeAgo(strategy.createdAt)}
              </div>
            </div>
          </div>

          {/* CA Section (ticker & address) */}
          <div className="flex items-center justify-between p-3 bg-black/60 rounded-2xl border border-white/5 group active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                <span className="text-emerald-500 font-black text-[10px]">CA</span>
              </div>
              <span className="text-[11px] text-white/40 font-mono truncate max-w-[180px]">{strategy.id}</span>
            </div>
            <button 
              onClick={handleCopy}
              className="p-2 hover:bg-white/5 rounded-xl transition-colors relative"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-white/20" />}
            </button>
          </div>
        </div>

      </div>
    </motion.div>
  );
};