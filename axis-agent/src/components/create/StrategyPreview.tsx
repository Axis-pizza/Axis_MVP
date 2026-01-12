/**
 * Strategy Preview Card - Shows AI-generated strategy with backtest
 */

import { motion } from 'framer-motion';
import { Zap, Shield, Waves, Check } from 'lucide-react';
import { BacktestChart } from '../common/BacktestChart';
import type { Strategy } from '../../types';

interface StrategyPreviewProps {
  strategy: Strategy;
  selected?: boolean;
  onSelect?: (strategy: Strategy) => void;
  expanded?: boolean;
  themeColor?: string;
}

const typeIcons = {
  AGGRESSIVE: Zap,
  BALANCED: Waves,
  CONSERVATIVE: Shield,
};

const typeColors = {
  AGGRESSIVE: { bg: 'from-orange-500/20 to-red-500/20', border: 'border-orange-500/50', text: 'text-orange-400' },
  BALANCED: { bg: 'from-blue-500/20 to-purple-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
  CONSERVATIVE: { bg: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400' },
};

export const StrategyPreview = ({ strategy, selected, onSelect, expanded = false, themeColor }: StrategyPreviewProps) => {
  const Icon = typeIcons[strategy.type];
  const defaultColors = typeColors[strategy.type];

  // Dynamic style overrides if themeColor is provided
  const cardStyle = themeColor && selected ? {
    borderColor: themeColor,
    boxShadow: `0 10px 30px -10px ${themeColor}40`
  } : {};

  // For gradient we can't easily use arbitrary string colors without inline styles or generating classes
  // We'll stick to default classes via Tailwind unless we reconstruct the gradient logic
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect?.(strategy)}
      className={`
        relative rounded-2xl cursor-pointer overflow-hidden transition-all
        ${selected 
          ? `bg-gradient-to-br ${defaultColors.bg} border-2 ${defaultColors.border} shadow-xl` 
          : 'bg-white/[0.03] border border-white/10 hover:border-white/20'
        }
      `}
      style={cardStyle}
    >
      {/* Selection indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center z-10"
          style={themeColor ? { backgroundColor: themeColor } : undefined}
        >
          <Check className="w-4 h-4 text-black" />
        </motion.div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div 
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${defaultColors.bg} flex items-center justify-center ${defaultColors.border} border`}
            style={themeColor && selected ? { borderColor: themeColor } : undefined}
          >
            <Icon 
              className={`w-6 h-6 ${!themeColor ? defaultColors.text : ''}`} 
              style={themeColor && selected ? { color: themeColor } : undefined}
            />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg leading-tight">{strategy.name}</h3>
            <p className="text-xs text-white/40 mt-0.5">{strategy.description}</p>
          </div>
        </div>

        {/* Token Pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {strategy.tokens.map((t) => (
            <span
              key={t.symbol}
              className="px-2 py-1 text-xs font-medium bg-white/10 rounded-lg border border-white/10"
            >
              {t.symbol} <span className="text-white/50">{t.weight}%</span>
            </span>
          ))}
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-black/30 rounded-xl mb-4">
          <div className="text-center">
            <p className="text-[10px] text-white/40">APY</p>
            <p 
              className={`text-sm font-bold ${!themeColor ? defaultColors.text : ''}`}
              style={themeColor && selected ? { color: themeColor } : undefined}
            >
              +{strategy.metrics.expectedApy}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-white/40">Risk</p>
            <p className="text-sm font-bold">{strategy.metrics.riskScore}/10</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-white/40">Win Rate</p>
            <p className="text-sm font-bold">{strategy.metrics.winRate}%</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-white/40">Sharpe</p>
            <p className="text-sm font-bold">{strategy.metrics.sharpeRatio}</p>
          </div>
        </div>

        {/* Backtest Chart */}
        {(expanded || selected) && strategy.backtest && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <BacktestChart data={strategy.backtest} height={120} showMetrics={false} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
