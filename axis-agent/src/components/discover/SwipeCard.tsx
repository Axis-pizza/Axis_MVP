/**
 * SwipeCard - Premium Strategy Card
 * High-End "Menu" Aesthetic
 */

import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { ExternalLink, TrendingUp, User } from 'lucide-react';
import { PizzaChart } from '../common/PizzaChart';

interface Token {
  symbol: string;
  weight: number;
  logoUrl?: string;
}

interface StrategyCardData {
  id: string;
  name: string;
  type: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  tokens: Token[];
  roi: number; // ROI percentage
  tvl: number;
  imageUrl?: string;
  creatorAddress: string;
  creatorPfpUrl?: string;
  description?: string;
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
  
  const leftIndicatorOpacity = useTransform(x, [-100, 0], [1, 0]);
  const rightIndicatorOpacity = useTransform(x, [0, 100], [0, 1]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipeRight();
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipeLeft();
    }
  };

  const typeColors = {
    AGGRESSIVE: 'from-[#9F1239] to-[#881337]',
    BALANCED: 'from-[#D97706] to-[#B45309]',
    CONSERVATIVE: 'from-[#15803D] to-[#14532D]',
  };

  const formatROI = (roi: number) => {
    const sign = roi >= 0 ? '+' : '';
    return `${sign}${roi.toFixed(1)}%`;
  };

  const formatTVL = (tvl: number) => {
    if (tvl >= 1000) return `${(tvl / 1000).toFixed(1)}K`;
    return tvl.toFixed(2);
  };

  const explorerUrl = `https://solscan.io/account/${strategy.id}?cluster=devnet`;

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? opacity : 1,
        scale: 1 - index * 0.05,
        zIndex: 10 - index,
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={isTop ? handleDragEnd : undefined}
      onClick={isTop ? onTap : undefined}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ 
        scale: 1 - index * 0.05, 
        opacity: 1,
        y: index * 8,
      }}
      exit={{ 
        x: x.get() > 0 ? 300 : -300, 
        opacity: 0,
        transition: { duration: 0.3 }
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="w-full h-full bg-[#1C1917] border border-[#D97706]/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col relative">
        {/* Glow effect */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#D97706]/10 to-transparent pointer-events-none" />

        {/* Strategy Image / Pizza Chart */}
        <div className="relative h-56 flex items-center justify-center bg-[#0C0A09]">
          {strategy.imageUrl ? (
            <img 
              src={strategy.imageUrl} 
              alt={strategy.name}
              className="w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className="scale-110">
              <PizzaChart slices={strategy.tokens} size={160} showLabels={false} animated={false} />
            </div>
          )}
          
          {/* Swipe Indicators */}
          {isTop && (
            <>
              <motion.div 
                className="absolute top-6 left-6 px-4 py-2 border-2 border-[#9F1239] text-[#9F1239] font-serif font-bold tracking-widest text-lg rounded-lg transform -rotate-12 bg-black/50 backdrop-blur-sm"
                style={{ opacity: leftIndicatorOpacity }}
              >
                PASS
              </motion.div>
              <motion.div 
                className="absolute top-6 right-6 px-4 py-2 border-2 border-[#15803D] text-[#15803D] font-serif font-bold tracking-widest text-lg rounded-lg transform rotate-12 bg-black/50 backdrop-blur-sm"
                style={{ opacity: rightIndicatorOpacity }}
              >
                INVEST
              </motion.div>
            </>
          )}

          {/* Type Badge - Wax Seal Style */}
          <div className={`absolute bottom-4 right-4 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-gradient-to-r ${typeColors[strategy.type]} text-white shadow-lg border border-white/10`}>
            {strategy.type}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col relative z-10">
          {/* Header */}
          <div className="mb-5">
            <h2 className="text-2xl font-serif font-bold text-[#E7E5E4] mb-2 leading-tight">{strategy.name}</h2>
            {strategy.description && (
              <p className="text-sm text-[#A8A29E] font-serif italic line-clamp-2">{strategy.description}</p>
            )}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-px bg-[#D97706]/20 rounded-lg overflow-hidden border border-[#D97706]/10 mb-5">
            <div className="bg-[#0C0A09] p-4 text-center">
              <p className="text-[10px] text-[#78716C] uppercase tracking-widest mb-1">ROI</p>
              <p className={`text-xl font-serif font-bold ${strategy.roi >= 0 ? 'text-[#D97706]' : 'text-[#9F1239]'}`}>
                {formatROI(strategy.roi)}
              </p>
            </div>
            <div className="bg-[#0C0A09] p-4 text-center">
              <p className="text-[10px] text-[#78716C] uppercase tracking-widest mb-1">TVL</p>
              <p className="text-xl font-serif font-bold text-[#E7E5E4]">{formatTVL(strategy.tvl)} <span className="text-xs font-normal text-[#78716C]">SOL</span></p>
            </div>
          </div>

          {/* Token Allocation */}
          <div className="mb-4">
            <p className="text-[10px] text-[#78716C] uppercase tracking-widest mb-3">Composition</p>
            <div className="flex flex-wrap gap-2">
              {strategy.tokens.slice(0, 5).map((token) => (
                <div 
                  key={token.symbol}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0C0A09] border border-[#D97706]/20 rounded-md"
                >
                  <span className="text-xs font-serif font-bold text-[#D97706]">{token.symbol}</span>
                  <span className="text-[10px] text-[#78716C]">{token.weight}%</span>
                </div>
              ))}
              {strategy.tokens.length > 5 && (
                <div className="px-3 py-1.5 bg-[#0C0A09] border border-[#D97706]/10 rounded-md text-xs text-[#78716C]">
                  +{strategy.tokens.length - 5}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between pt-4 border-t border-[#D97706]/10">
            <div className="flex items-center gap-3">
              {strategy.creatorPfpUrl ? (
                <img 
                  src={strategy.creatorPfpUrl} 
                  alt="Creator" 
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-[#D97706]/30"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#292524] flex items-center justify-center ring-1 ring-[#D97706]/30">
                  <User className="w-4 h-4 text-[#A8A29E]" />
                </div>
              )}
              <span className="text-xs text-[#A8A29E] font-mono">
                {strategy.creatorAddress.slice(0, 4)}...{strategy.creatorAddress.slice(-4)}
              </span>
            </div>

            <a 
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-xs text-[#D97706] hover:text-[#F59E0B] transition-colors font-serif italic"
            >
              Verify on Solscan <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};