/**
 * Backtest Chart - Strategy performance visualization
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface BacktestChartProps {
  data: {
    timestamps: number[];
    values: number[];
    sharpeRatio?: number;
    maxDrawdown?: number;
    volatility?: number;
  };
  height?: number;
  showMetrics?: boolean;
}

export const BacktestChart = ({ data, height = 140, showMetrics = true }: BacktestChartProps) => {
  const { path, areaPath, change, benchmarkPath } = useMemo(() => {
    if (!data.values || data.values.length < 2) {
      return { path: '', areaPath: '', change: 0, benchmarkPath: '' };
    }

    const values = data.values;
    const min = Math.min(...values) * 0.95;
    const max = Math.max(...values) * 1.05;
    const range = max - min || 1;

    const width = 280;
    const h = height - 40;

    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = h - ((v - min) / range) * h;
      return { x, y };
    });

    const pathStr = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
    const areaStr = `${pathStr} L ${width},${h} L 0,${h} Z`;

    // Benchmark: straight line from 100 to 100
    const benchmarkY = h - ((100 - min) / range) * h;
    const benchmarkStr = `M 0,${benchmarkY} L ${width},${benchmarkY}`;

    const change = ((values[values.length - 1] - values[0]) / values[0]) * 100;

    return { path: pathStr, areaPath: areaStr, change, benchmarkPath: benchmarkStr };
  }, [data, height]);

  const isPositive = change >= 0;

  return (
    <div className="relative">
      {/* Header Stats */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-white/40 mb-1">Backtest Performance</p>
          <span className={`text-2xl font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{change.toFixed(1)}%
          </span>
        </div>
        {showMetrics && data.sharpeRatio !== undefined && (
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-[10px] text-white/40">Sharpe</p>
              <p className="text-sm font-bold text-white/80">{data.sharpeRatio.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/40">Max DD</p>
              <p className="text-sm font-bold text-red-400">{data.maxDrawdown?.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-[10px] text-white/40">Vol</p>
              <p className="text-sm font-bold text-white/80">{data.volatility?.toFixed(1)}%</p>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 280 ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="backtestGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0.4" />
            <stop offset="100%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Benchmark line */}
        <path
          d={benchmarkPath}
          fill="none"
          stroke="white"
          strokeOpacity="0.1"
          strokeWidth="1"
          strokeDasharray="4,4"
        />

        {/* Area */}
        <motion.path
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          d={areaPath}
          fill="url(#backtestGradient)"
        />

        {/* Line */}
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          d={path}
          fill="none"
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* End point */}
        <motion.circle
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1, type: 'spring' }}
          cx="280"
          cy={path.split(' ').pop()?.split(',')[1] || 0}
          r="4"
          fill={isPositive ? '#10b981' : '#ef4444'}
        />
      </svg>

      {/* Time labels */}
      <div className="flex justify-between text-[10px] text-white/30 mt-1">
        <span>30 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
};
