/**
 * Strategy Cards - The Simulation Step (Step 2)
 * Shows 3 AI-generated tactical strategies with backtest data
 */

import { motion } from 'framer-motion';
import { Zap, Shield, Waves, TrendingUp, Check } from 'lucide-react';
import { PizzaChart } from '../common/PizzaChart';
import { BacktestChart } from '../common/BacktestChart';
import type { Strategy } from '../../types'; // ★修正: グローバル型をインポート

interface StrategyCardsProps {
  strategies: Strategy[];
  selectedId: string | null;
  onSelect: (strategy: Strategy) => void;
  onConfirm: () => void;
}

const typeConfig = {
  AGGRESSIVE: {
    icon: Zap,
    label: 'SNIPER',
    gradient: 'from-orange-500 to-red-500',
    bgGradient: 'from-orange-500/10 to-red-500/10',
    borderColor: 'border-orange-500/50',
    textColor: 'text-orange-400',
  },
  BALANCED: {
    icon: Waves,
    label: 'WAVE',
    gradient: 'from-purple-500 to-indigo-500',
    bgGradient: 'from-purple-500/10 to-indigo-500/10',
    borderColor: 'border-purple-500/50',
    textColor: 'text-purple-400',
  },
  CONSERVATIVE: {
    icon: Shield,
    label: 'FORTRESS',
    gradient: 'from-emerald-500 to-teal-500',
    bgGradient: 'from-emerald-500/10 to-teal-500/10',
    borderColor: 'border-emerald-500/50',
    textColor: 'text-emerald-400',
  },
};

export const StrategyCards = ({ strategies, selectedId, onSelect, onConfirm }: StrategyCardsProps) => {
  const selectedStrategy = strategies.find(s => s.id === selectedId);

  return (
    <div className="min-h-screen px-4 py-6 pb-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h2 className="text-xl font-bold mb-1">Select Your Tactic</h2>
        <p className="text-sm text-white/50">AI generated 3 strategies based on your directive</p>
      </motion.div>

      {/* Strategy Cards */}
      <div className="space-y-4 max-w-md mx-auto">
        {strategies.map((strategy, i) => {
          const config = typeConfig[strategy.type];
          const Icon = config.icon;
          const isSelected = strategy.id === selectedId;

          return (
            <motion.div
              key={strategy.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onSelect(strategy)}
              className={`relative rounded-2xl cursor-pointer overflow-hidden transition-all ${
                isSelected
                  ? `bg-gradient-to-br ${config.bgGradient} border-2 ${config.borderColor} shadow-xl`
                  : 'bg-white/[0.03] border border-white/10 hover:border-white/20'
              }`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center z-10"
                >
                  <Check className="w-4 h-4 text-black" />
                </motion.div>
              )}

              <div className="p-4">
                {/* Header Row */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold ${config.textColor} tracking-wider`}>
                        {config.label}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg leading-tight">{strategy.name}</h3>
                    <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{strategy.description}</p>
                  </div>
                </div>

                {/* Pizza Chart + Metrics */}
                <div className="flex items-center gap-4">
                  {/* Mini Pizza Chart */}
                  <div className="flex-shrink-0">
                    <PizzaChart
                      slices={strategy.tokens}
                      size={100}
                      showLabels={false}
                      animated={false}
                    />
                  </div>

                  {/* Metrics Grid */}
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <MetricBox
                      label="Expected APY"
                      value={`+${strategy.metrics?.expectedApy ?? 0}%`} // ★修正: オプショナルチェーン
                      color={(strategy.metrics?.expectedApy ?? 0) > 50 ? 'text-orange-400' : 'text-emerald-400'}
                    />
                    <MetricBox
                      label="Risk Score"
                      value={`${strategy.metrics?.riskScore ?? '-'}/10`} // ★修正
                      color={(strategy.metrics?.riskScore ?? 0) > 6 ? 'text-red-400' : 'text-emerald-400'}
                    />
                    <MetricBox
                      label="Win Rate"
                      value={`${strategy.metrics?.winRate ?? '-'}%`} // ★修正
                      color="text-white"
                    />
                    <MetricBox
                      label="Sharpe"
                      value={strategy.metrics?.sharpeRatio?.toFixed(2) ?? '-'} // ★修正
                      color="text-white"
                    />
                  </div>
                </div>

                {/* Expanded Backtest (when selected) */}
                {isSelected && strategy.backtest && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-white/10"
                  >
                    <BacktestChart data={strategy.backtest} height={100} showMetrics={false} />
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Confirm Button */}
      {selectedStrategy && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-4 right-4 max-w-md mx-auto"
        >
          <button
            onClick={onConfirm}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl font-bold text-black flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
          >
            <TrendingUp className="w-5 h-5" />
            Customize {selectedStrategy.name}
          </button>
        </motion.div>
      )}
    </div>
  );
};

const MetricBox = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="p-2 bg-black/30 rounded-lg text-center">
    <p className="text-[9px] text-white/40 mb-0.5">{label}</p>
    <p className={`text-sm font-bold ${color}`}>{value}</p>
  </div>
);