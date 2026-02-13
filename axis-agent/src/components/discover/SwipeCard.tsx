import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
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

// --- Helpers (変更なし) ---
const formatPrice = (price: any) => {
  const p = Number(price);
  if (isNaN(p) || p === 0) return '$0.00';
  if (p < 0.000001) return '$' + p.toFixed(8);
  if (p < 0.01) return '$' + p.toFixed(6);
  if (p < 1) return '$' + p.toFixed(4);
  return '$' + p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const FormatChange = ({ value, className, iconSize = "w-3 h-3" }: { value: any, className?: string, iconSize?: string }) => {
  const c = Number(value);
  if (isNaN(c) || !isFinite(c)) return <span className={`font-bold text-white/40 ${className}`}>0.00%</span>;
  const isPositive = c >= 0;
  return (
    <span className={`flex items-center justify-center font-bold ${isPositive ? 'text-[#34D399]' : 'text-[#F87171]'} ${className}`} style={{ textShadow: isPositive ? '0 0 10px rgba(52, 211, 153, 0.4)' : '0 0 10px rgba(248, 113, 113, 0.4)' }}>
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
      if (address) setImgSrc(`https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${address}/logo.png`);
      else setImgSrc(`https://ui-avatars.com/api/?name=${symbol}&background=random&color=fff&size=128&bold=true`);
    } else if (nextCount === 2) {
      setImgSrc(`https://ui-avatars.com/api/?name=${symbol}&background=random&color=fff&size=128&bold=true`);
    }
  };

  return <img src={imgSrc} alt={symbol} className={className} onError={handleError} loading="lazy" />;
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

  const isDragging = useRef(false);

  const handleDragStart = () => { isDragging.current = true; };
  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) onSwipeRight();
    else if (info.offset.x < -SWIPE_THRESHOLD) onSwipeLeft();
    setTimeout(() => { isDragging.current = false; }, 200);
  };
  const handleClick = () => { if (!isDragging.current && isTop) onTap(); };

  // 金色ベースのリキッド感のあるバッジスタイル
  const typeColors = {
    AGGRESSIVE: 'text-amber-200 border-amber-500/30 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    BALANCED: 'text-blue-200 border-blue-500/30 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]',
    CONSERVATIVE: 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
  };

  return (
    <motion.div
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing perspective-1000"
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
      dragElastic={0.6}
      onDragStart={isTop ? handleDragStart : undefined}
      onDragEnd={isTop ? handleDragEnd : undefined}
      onClick={handleClick}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1 - index * 0.05, opacity: 1, y: index * 12 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      {/* Glass Container: 暗いガラスに変更 */}
      <div 
        className="w-full h-full rounded-[32px] overflow-hidden flex flex-col relative select-none transition-all duration-300"
        style={{
          background: 'linear-gradient(145deg, rgba(10,10,10,0.6) 0%, rgba(5,5,5,0.4) 100%)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        {/* Glossy Reflection: 暗い背景に合わせた反射 */}
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-t-[32px]" />
        
        {/* Swipe Indicators (変更なし) */}
        {isTop && (
          <>
            <motion.div 
              className="absolute top-12 left-8 z-50 border-[3px] border-[#34D399] text-[#34D399] font-black text-3xl px-4 py-2 rounded-2xl transform -rotate-12 bg-black/40 backdrop-blur-md shadow-[0_0_20px_rgba(52,211,153,0.3)] pointer-events-none"
              style={{ opacity: likeOpacity }}
            >
              LIKE
            </motion.div>
            <motion.div 
              className="absolute top-12 right-8 z-50 border-[3px] border-[#F87171] text-[#F87171] font-black text-3xl px-4 py-2 rounded-2xl transform rotate-12 bg-black/40 backdrop-blur-md shadow-[0_0_20px_rgba(248,113,113,0.3)] pointer-events-none"
              style={{ opacity: nopeOpacity }}
            >
              PASS
            </motion.div>
          </>
        )}

        {/* --- Header --- */}
        <div className="p-6 pb-2 relative z-10">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border backdrop-blur-md mb-2 ${typeColors[strategy.type] || typeColors.BALANCED}`}>
                {strategy.type}
              </div>
              <h2 className="text-[26px] font-bold text-white leading-none tracking-tight drop-shadow-md">
                ${strategy.ticker || strategy.name}
              </h2>
              {strategy.ticker && (
                <p className="text-sm text-white/60 mt-1 font-medium tracking-wide">{strategy.name}</p>
              )}
            </div>
            
            {/* PFP (Glassy Circle with Golden Glow) */}
            <div className="relative group">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-br from-amber-300/30 to-amber-500/5 relative z-10 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                 <img 
                    src={strategy.creatorPfpUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${strategy.creatorAddress}`} 
                    alt="Creator" 
                    className="w-full h-full rounded-full object-cover bg-black/40"
                 />
              </div>
            </div>
          </div>
          
          <p className="text-[13px] text-white/70 line-clamp-2 min-h-[2.6em] leading-relaxed font-light">
            {strategy.description || "No description provided."}
          </p>
          
          <div className="flex items-center gap-3 mt-4">
             <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 border border-white/10 backdrop-blur-sm transition-colors hover:bg-black/40">
                <span className="text-[10px] text-white/60 font-mono tracking-wider">
                  {strategy.id.slice(0, 4)}...{strategy.id.slice(-4)}
                </span>
                <Copy className="w-3 h-3 text-white/40" />
             </div>
             <div className="flex items-center gap-1 text-[11px] text-white/50 font-medium">
                <Clock className="w-3 h-3" />
                {timeAgo(strategy.createdAt)}
             </div>
          </div>
        </div>

        {/* --- Stats (Floating Pills with Golden/Dark Theme) --- */}
        <div className="px-6 py-2 grid grid-cols-2 gap-3 relative z-10">
           {/* ROI Card */}
           <div className="col-span-1 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md shadow-inner flex flex-col items-center justify-center h-[100px] relative overflow-hidden group">
              <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${strategy.roi >= 0 ? 'from-emerald-500/30 to-transparent' : 'from-red-500/30 to-transparent'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest mb-1 text-white/40 z-10">
                 24h Change
              </span>
              <FormatChange value={strategy.roi} className="text-3xl drop-shadow-sm z-10" iconSize="w-6 h-6" />
           </div>

           {/* TVL Card */}
           <div className="col-span-1 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md shadow-inner flex flex-col justify-center px-4 h-[100px] relative overflow-hidden">
               <div className="absolute top-0 right-0 p-3 opacity-10">
                 <Wallet className="w-12 h-12 text-white" />
               </div>
               <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1 z-10">TVL (USDC)</span>
               <div className="text-2xl font-bold text-white tracking-tight z-10 drop-shadow-sm">
                  {strategy.tvl < 0.01 ? '< 0.01' : strategy.tvl.toLocaleString()}
               </div>
           </div>
        </div>

        {/* --- Composition List (Clear Dark Glass List) --- */}
        <div className="flex-1 px-6 py-2 overflow-hidden flex flex-col relative z-10">
           <div className="flex items-center justify-between mb-3 pt-2">
              <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-amber-400/50" /> Assets
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/5">{strategy.tokens.length}</span>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar mask-image-b">
              {strategy.tokens.map((token, i) => (
                 <div key={i} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors group border border-transparent hover:border-white/10 bg-black/20 backdrop-blur-sm">
                    {/* Left */}
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-black/40 shadow-inner flex items-center justify-center p-0.5 border border-white/5">
                          <TokenIcon 
                            symbol={token.symbol} 
                            src={token.logoURI} 
                            address={token.address}
                            className="w-full h-full object-cover rounded-full"
                          />
                       </div>
                       <div>
                          <div className="font-bold text-sm text-white tracking-wide group-hover:text-white transition-colors">{token.symbol}</div>
                          <div className="text-[11px] text-white/40 font-mono group-hover:text-white/60 transition-colors">
                             {formatPrice(token.currentPrice)}
                          </div>
                       </div>
                    </div>
                    
                    {/* Right */}
                    <div className="text-right min-w-[70px]">
                       <div className="font-bold text-sm text-white mb-0.5">{token.weight}%</div>
                       {token.change24h !== undefined ? (
                          <div className="flex justify-end opacity-80 group-hover:opacity-100">
                            <FormatChange value={token.change24h} className="text-[10px]" />
                          </div>
                       ) : (
                          <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                             <div className="h-full bg-white/80 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" style={{ width: `${token.weight}%` }} />
                          </div>
                       )}
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* --- Footer (Seamless Dark) --- */}
        <div className="p-3 mt-auto flex justify-center border-t border-white/5 bg-gradient-to-t from-black/40 to-transparent">
           <a
              href={`https://solscan.io/token/${strategy.mintAddress || strategy.id}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-white/30 font-mono hover:text-white/80 flex items-center gap-1.5 transition-all duration-300"
           >
              Mint: <span className="underline decoration-white/20 underline-offset-2">{(strategy.mintAddress || strategy.id).slice(0, 8)}...</span> <ExternalLink className="w-2.5 h-2.5" />
           </a>
        </div>
      </div>
    </motion.div>
  );
};