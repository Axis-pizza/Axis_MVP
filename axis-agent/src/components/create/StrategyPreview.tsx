/**
 * Strategy Preview Card - Shows AI-generated strategy with backtest
 * Refined for High-End Artisan Aesthetic
 */

import { motion } from 'framer-motion';
import { Zap, Shield, Scale, Check, Sparkles } from 'lucide-react'; // Waves -> Scale (Balance)
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
  BALANCED: Scale, // 天秤（バランス）に変更
  CONSERVATIVE: Shield,
};

// 高級感のあるカラーパレット（スパイス、チーズ、バジル）
const typeColors = {
  AGGRESSIVE: { 
    bg: 'from-[#9F1239]/20 to-[#BE123C]/10', // Deep Rose/Chili
    border: 'border-[#9F1239]/40', 
    text: 'text-[#FB7185]',
    icon: '#E11D48'
  },
  BALANCED: { 
    bg: 'from-[#D97706]/20 to-[#B45309]/10', // Gold/Bronze
    border: 'border-[#D97706]/40', 
    text: 'text-[#FCD34D]',
    icon: '#F59E0B'
  },
  CONSERVATIVE: { 
    bg: 'from-[#15803D]/20 to-[#166534]/10', // Deep Basil/Green
    border: 'border-[#15803D]/40', 
    text: 'text-[#86EFAC]',
    icon: '#22C55E'
  },
};

export const StrategyPreview = ({ strategy, selected, onSelect, expanded = false, themeColor }: StrategyPreviewProps) => {
  const Icon = typeIcons[strategy.type as keyof typeof typeIcons] || Zap;
  const defaultColors = typeColors[strategy.type as keyof typeof typeColors] || typeColors.AGGRESSIVE;

  const cardStyle = themeColor && selected ? {
    borderColor: themeColor,
    boxShadow: `0 8px 30px -10px ${themeColor}30`,
    backgroundColor: 'rgba(28, 25, 23, 0.8)' // Warm dark bg
  } : {};
  
  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect?.(strategy)}
      className={`
        relative rounded-xl cursor-pointer overflow-hidden transition-all duration-300
        ${selected 
          ? `bg-gradient-to-br ${defaultColors.bg} border ${defaultColors.border} shadow-2xl` 
          : 'bg-[#1C1917]/40 border border-[#D97706]/10 hover:border-[#D97706]/30 hover:bg-[#1C1917]/60'
        }
      `}
      style={cardStyle}
    >
      {/* Selection indicator - Gold Check */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-6 h-6 bg-[#D97706] rounded-full flex items-center justify-center z-10 shadow-lg shadow-orange-900/50"
          style={themeColor ? { backgroundColor: themeColor } : undefined}
        >
          <Check className="w-3.5 h-3.5 text-[#0C0A09]" />
        </motion.div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div 
            className={`w-10 h-10 rounded-lg bg-gradient-to-br ${defaultColors.bg} flex items-center justify-center border ${defaultColors.border} shadow-inner`}
            style={themeColor && selected ? { borderColor: themeColor } : undefined}
          >
            <Icon 
              className="w-5 h-5"
              style={{ color: themeColor && selected ? themeColor : defaultColors.icon }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-bold text-xl leading-tight text-[#E7E5E4] tracking-wide">
              {strategy.name}
            </h3>
            <p className="text-xs text-[#A8A29E] mt-1 font-serif italic line-clamp-1">
              {strategy.description}
            </p>
          </div>
        </div>

        {/* Token Pills - Elegant Style */}
        <div className="flex flex-wrap gap-2 mb-5">
          {strategy.tokens.map((t) => (
            <span
              key={t.symbol}
              className="px-3 py-1 text-[10px] font-medium tracking-wider bg-[#0C0A09] rounded-sm border border-[#D97706]/20 text-[#D97706]"
            >
              {t.symbol} <span className="text-[#78716C] ml-1">{t.weight}%</span>
            </span>
          ))}
        </div>

        {/* AI Suggestion - Menu Description Style */}
        {strategy.aiSuggestion && (
          <div className="mb-5 p-4 bg-[#0C0A09]/50 rounded-lg border border-[#D97706]/10 relative">
             <Sparkles className="absolute top-3 left-3 w-3 h-3 text-[#D97706]/60" />
            <p className="text-xs text-[#D6D3D1] italic leading-relaxed pl-5 font-serif">
              "{strategy.aiSuggestion}"
            </p>
          </div>
        )}

        {/* Metrics Row - Minimalist Table */}
        <div className="grid grid-cols-4 gap-px bg-[#D97706]/20 rounded-lg overflow-hidden border border-[#D97706]/10">
          <div className="bg-[#1C1917] p-3 text-center">
            <p className="text-[9px] text-[#78716C] uppercase tracking-widest mb-0.5">ROI</p>
            <p className={`text-sm font-bold font-serif ${defaultColors.text}`}>
              +{strategy.metrics.expectedApy}%
            </p>
          </div>
          <div className="bg-[#1C1917] p-3 text-center">
            <p className="text-[9px] text-[#78716C] uppercase tracking-widest mb-0.5">Risk</p>
            <p className="text-sm font-serif text-[#E7E5E4]">{strategy.metrics.riskScore}<span className="text-[9px] text-[#57534E]">/10</span></p>
          </div>
          <div className="bg-[#1C1917] p-3 text-center">
            <p className="text-[9px] text-[#78716C] uppercase tracking-widest mb-0.5">Win</p>
            <p className="text-sm font-serif text-[#E7E5E4]">{strategy.metrics.winRate}%</p>
          </div>
          <div className="bg-[#1C1917] p-3 text-center">
            <p className="text-[9px] text-[#78716C] uppercase tracking-widest mb-0.5">Sharpe</p>
            <p className="text-sm font-serif text-[#E7E5E4]">{strategy.metrics.sharpeRatio}</p>
          </div>
        </div>

        {/* Backtest Chart */}
        {(expanded || selected) && strategy.backtest && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-[#D97706]/10"
          >
            <BacktestChart data={strategy.backtest} height={120} showMetrics={false} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};