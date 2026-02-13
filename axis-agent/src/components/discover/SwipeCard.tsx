import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, Copy, ExternalLink, Wallet } from 'lucide-react';

// --- Types ---
interface Token {
  symbol: string;
  weight: number;
  address?: string; // Mint Address
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
  rebalanceType?: string;
  mintAddress?: string;
  vaultAddress?: string;
}

interface SwipeCardProps {
  strategy: StrategyCardData;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
  isTop: boolean;
  index: number;
}

const SWIPE_THRESHOLD = 100;
const ROTATION_RANGE = 15;


// --- Helpers ---

// Memeコイン対応価格フォーマッター
const formatPrice = (price: any) => {
  const p = Number(price);
  if (isNaN(p) || p === 0) return '$0.00';

  if (p < 0.000001) return '$' + p.toFixed(8);
  if (p < 0.01) return '$' + p.toFixed(6);
  if (p < 1) return '$' + p.toFixed(4);
  
  return '$' + p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ✅ 修正: 文字サイズやアイコンサイズを柔軟に変更可能に
const FormatChange = ({ value, className, iconSize = "w-3 h-3" }: { value: any, className?: string, iconSize?: string }) => {
  const c = Number(value);
  
  if (isNaN(c) || !isFinite(c)) {
    return <span className={`font-bold text-gray-500 ${className}`}>0.00%</span>;
  }

  const isPositive = c >= 0;
  return (
    <span className={`flex items-center justify-center font-black ${isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'} ${className}`}>
      {isPositive ? <TrendingUp className={`${iconSize} mr-1.5`} /> : <TrendingDown className={`${iconSize} mr-1.5`} />}
      {Math.abs(c).toFixed(2)}%
    </span>
  );
};

const timeAgo = (timestamp: number) => {
  if (!timestamp) return 'Recently';
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  const days = Math.floor(seconds / 86400);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
};

const TokenIcon = ({ symbol, src, address, className }: { symbol: string, src?: string | null, address?: string, className?: string }) => {
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
      if (address) {
        setImgSrc(`https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${address}/logo.png`);
      } else {
        setImgSrc(`https://ui-avatars.com/api/?name=${symbol}&background=random&color=fff&size=128&bold=true`);
      }
    } else if (nextCount === 2) {
      setImgSrc(`https://ui-avatars.com/api/?name=${symbol}&background=random&color=fff&size=128&bold=true`);
    }
  };

  return (
    <img 
      src={imgSrc}
      alt={symbol}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
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
  const isPositive = strategy.roi >= 0;
  
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);

  const isDragging = useRef(false);

  const handleDragStart = () => {
    isDragging.current = true;
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipeRight();
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipeLeft();
    }
    setTimeout(() => {
      isDragging.current = false;
    }, 200);
  };

  const handleClick = () => {
    if (!isDragging.current && isTop) {
      onTap();
    }
  };

  const typeColors = {
    AGGRESSIVE: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    BALANCED: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    CONSERVATIVE: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <motion.div
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? opacity : 1,
        scale: 1 - index * 0.05,
        zIndex: 100 - index,
        y: index * 10, 
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragStart={isTop ? handleDragStart : undefined}
      onDragEnd={isTop ? handleDragEnd : undefined}
      onClick={handleClick}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1 - index * 0.05, opacity: 1, y: index * 10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="w-full h-full bg-[#121212] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col relative select-none">
      <div className={`absolute inset-0 pointer-events-none opacity-60 ${
          isPositive
            ? 'bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.08),transparent_60%)]'
            : 'bg-[radial-gradient(ellipse_at_top_left,rgba(239,68,68,0.08),transparent_60%)]'
        }`} />
        {/* Swipe Indicators */}
        {isTop && (
          <>
            <motion.div 
              className="absolute top-10 left-10 z-50 border-[6px] border-emerald-500 text-emerald-500 font-black text-4xl px-4 py-2 rounded-xl transform -rotate-12 bg-black/40 backdrop-blur-sm pointer-events-none"
              style={{ opacity: likeOpacity }}
            >
              LIKE
            </motion.div>
            <motion.div 
              className="absolute top-10 right-10 z-50 border-[6px] border-red-500 text-red-500 font-black text-4xl px-4 py-2 rounded-xl transform rotate-12 bg-black/40 backdrop-blur-sm pointer-events-none"
              style={{ opacity: nopeOpacity }}
            >
              PASS
            </motion.div>
          </>
        )}

        {/* --- Header --- */}
        <div className="p-5 pb-2">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${typeColors[strategy.type] || typeColors.BALANCED} mb-2`}>
                {strategy.type}
              </div>
              <h2 className="text-2xl font-bold text-white leading-tight line-clamp-1">
                ${strategy.ticker || strategy.name}
              </h2>
              {strategy.ticker && (
                <p className="text-xs text-white/40 mt-0.5">{strategy.name}</p>
              )}
            </div>
            {/* PFP */}
            <div className="flex flex-col items-center">
               <div className="w-10 h-10 rounded-full bg-[#292524] p-0.5 border border-white/10 overflow-hidden">
                 <img 
                    src={strategy.creatorPfpUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${strategy.creatorAddress}`} 
                    alt="Creator" 
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${strategy.creatorAddress}`;
                    }}
                 />
               </div>
               <span className="text-[9px] text-white/40 mt-1 font-mono">{strategy.creatorAddress.slice(0,4)}</span>
            </div>
          </div>
          
          <p className="text-xs text-white/60 line-clamp-2 min-h-[2.5em]">
            {strategy.description || "No description provided."}
          </p>
          
          <div className="flex items-center gap-3 mt-3">
             <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                <span className="text-[10px] text-white/40 font-mono">
                  {strategy.id.slice(0, 4)}...{strategy.id.slice(-4)}
                </span>
                <Copy className="w-3 h-3 text-white/20" />
             </div>
             <div className="flex items-center gap-1 text-[10px] text-white/40">
                <Clock className="w-3 h-3" />
                {timeAgo(strategy.createdAt)}
             </div>
          </div>
        </div>

        {/* --- Stats --- */}
        <div className="px-5 py-2 grid grid-cols-2 gap-2">
           
           {/* ✅ 修正: 24h Change Card (大きく表示 & 中央揃え) */}
           <div className={`col-span-1 p-3 rounded-2xl border ${strategy.roi >= 0 ? 'bg-[#10B981]/10 border-[#10B981]/20' : 'bg-[#EF4444]/10 border-[#EF4444]/20'} flex flex-col items-center justify-center h-24`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70 ${strategy.roi >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                 24h Change
              </span>
              <FormatChange value={strategy.roi} className="text-3xl" iconSize="w-6 h-6" />
           </div>

           {/* Right Column Stats */}
           <div className="col-span-1 flex h-24">
              <div className="flex-1 p-3 bg-white/5 border border-white/5 rounded-2xl flex flex-col justify-center px-3">
                 <span className="text-[10px] text-white/40 uppercase font-bold mb-1">TVL</span>
                 <div className="text-2xl font-bold text-white">
                    {strategy.tvl < 0.01 ? '< 0.01' : strategy.tvl.toFixed(2)}
                 </div>
                 <span className="text-xs text-white/50 font-normal">USDC</span>
              </div>
           </div>
        </div>

        {/* --- Composition List --- */}
        <div className="flex-1 px-5 py-2 overflow-hidden flex flex-col">
           <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-1">
                <Wallet className="w-3 h-3" /> Composition
              </span>
              <span className="text-[10px] text-white/20">{strategy.tokens.length} Assets</span>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {strategy.tokens.map((token, i) => (
                 <div key={i} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/5 hover:bg-white/[0.05] transition-colors">
                    {/* Left: Icon & Symbol & Price */}
                    <div className="flex items-center gap-3">
                       <div className="w-9 h-9 rounded-full bg-white/10 overflow-hidden flex-shrink-0 border border-white/5">
                          <TokenIcon 
                            symbol={token.symbol} 
                            src={token.logoURI} 
                            address={token.address}
                            className="w-full h-full object-cover"
                          />
                       </div>
                       <div>
                          <div className="font-bold text-sm text-white">{token.symbol}</div>
                          <div className="text-[11px] text-white/50 font-mono">
                             {formatPrice(token.currentPrice)}
                          </div>
                       </div>
                    </div>
                    
                    {/* Right: Weight & 24h Change */}
                    <div className="text-right min-w-[60px]">
                       <div className="font-bold text-sm text-white mb-0.5">{token.weight}%</div>
                       
                       {token.change24h !== undefined ? (
                          <div className="flex justify-end">
                            <FormatChange value={token.change24h} className="text-[10px]" />
                          </div>
                       ) : (
                          <div className="w-full h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
                             <div className="h-full bg-orange-500 rounded-full" style={{ width: `${token.weight}%` }} />
                          </div>
                       )}
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* --- Footer --- */}
        <div className="p-3 border-t border-white/5 bg-[#0C0A09] flex justify-center">
           <a
              href={`https://solscan.io/token/${strategy.mintAddress || strategy.id}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-white/20 font-mono hover:text-white/50 flex items-center gap-1 transition-colors"
           >
              Address: {(strategy.mintAddress || strategy.id).slice(0, 8)}... <ExternalLink className="w-2.5 h-2.5" />
           </a>
        </div>

      </div>
    </motion.div>
  );
};