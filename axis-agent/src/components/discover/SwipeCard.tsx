/**
 * SwipeCard - Tinder-style swipe card for strategy discovery
 * Smooth gesture support with spring physics
 */

import { motion, useMotionValue, useTransform } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
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
  
  // Indicator opacity based on swipe direction
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
    AGGRESSIVE: 'from-orange-500 to-red-500',
    BALANCED: 'from-blue-500 to-purple-500',
    CONSERVATIVE: 'from-emerald-500 to-teal-500',
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
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
      }}
    >
      <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Strategy Image / Pizza Chart */}
        <div className="relative h-48 bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center">
          {strategy.imageUrl ? (
            <img 
              src={strategy.imageUrl} 
              alt={strategy.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <PizzaChart slices={strategy.tokens} size={140} showLabels={false} animated={false} />
          )}
          
          {/* Swipe Indicators */}
          {isTop && (
            <>
              <motion.div 
                className="absolute top-4 left-4 px-4 py-2 bg-red-500/90 text-white font-bold rounded-xl"
                style={{ opacity: leftIndicatorOpacity }}
              >
                SKIP
              </motion.div>
              <motion.div 
                className="absolute top-4 right-4 px-4 py-2 bg-emerald-500/90 text-white font-bold rounded-xl"
                style={{ opacity: rightIndicatorOpacity }}
              >
                VIEW
              </motion.div>
            </>
          )}

          {/* Type Badge */}
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${typeColors[strategy.type]} text-white`}>
            {strategy.type}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate mb-1">{strategy.name}</h2>
              {strategy.description && (
                <p className="text-sm text-white/50 line-clamp-2">{strategy.description}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-white/5 rounded-xl">
              <p className="text-xs text-white/50 mb-1">ROI</p>
              <p className={`text-lg font-bold ${strategy.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                <TrendingUp className="w-4 h-4 inline mr-1" />
                {formatROI(strategy.roi)}
              </p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <p className="text-xs text-white/50 mb-1">TVL</p>
              <p className="text-lg font-bold">{formatTVL(strategy.tvl)} SOL</p>
            </div>
          </div>

          {/* Token Allocation */}
          <div className="mb-4">
            <p className="text-xs text-white/50 mb-2">Allocation</p>
            <div className="flex flex-wrap gap-1.5">
              {strategy.tokens.slice(0, 5).map((token) => (
                <div 
                  key={token.symbol}
                  className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg"
                >
                  {token.logoUrl ? (
                    <img src={token.logoUrl} alt={token.symbol} className="w-4 h-4 rounded-full" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-bold">
                      {token.symbol[0]}
                    </div>
                  )}
                  <span className="text-xs font-medium">{token.symbol}</span>
                  <span className="text-xs text-white/40">{token.weight}%</span>
                </div>
              ))}
              {strategy.tokens.length > 5 && (
                <div className="px-2 py-1 bg-white/5 rounded-lg text-xs text-white/40">
                  +{strategy.tokens.length - 5}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
            {/* Creator */}
            <div className="flex items-center gap-2">
              {strategy.creatorPfpUrl ? (
                <img 
                  src={strategy.creatorPfpUrl} 
                  alt="Creator" 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
              <span className="text-xs text-white/50 font-mono">
                {strategy.creatorAddress.slice(0, 4)}...{strategy.creatorAddress.slice(-4)}
              </span>
            </div>

            {/* Explorer Link */}
            <a 
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
            >
              Solscan <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export type { StrategyCardData };
