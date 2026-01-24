/**
 * Backtest Chart - Strategy performance visualization
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface BacktestChartProps {
  data: {
    timestamps?: number[]; // Optional
    values: number[];      // Required: Array of prices/values
    sharpeRatio?: number;
    maxDrawdown?: number;
    volatility?: number;
  };
  height?: number;
  showMetrics?: boolean;
  label?: string; // Custom label (e.g., "ROI (30d)")
}

export const BacktestChart = ({ 
  data, 
  height = 140, 
  showMetrics = true,
  label = "ROI (30d)" 
}: BacktestChartProps) => {
  const { path, areaPath, change, benchmarkPath, isValid } = useMemo(() => {
    // データが空、または配列でない場合は描画しない
    if (!data?.values || !Array.isArray(data.values) || data.values.length < 2) {
      return { path: '', areaPath: '', change: 0, benchmarkPath: '', isValid: false };
    }

    const values = data.values;
    const min = Math.min(...values) * 0.99; // マージンを少し詰める
    const max = Math.max(...values) * 1.01;
    const range = max - min || 1;

    const width = 280; // SVG viewBox width
    const h = height - 40; // Chart drawing height (minus header/padding)

    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = h - ((v - min) / range) * h;
      return { x, y };
    });

    const pathStr = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
    const areaStr = `${pathStr} L ${width},${h} L 0,${h} Z`;

    // Benchmark line (dotted) - Draw a straight line from start price
    const startY = points[0].y;
    const benchmarkStr = `M 0,${startY} L ${width},${startY}`;

    const change = ((values[values.length - 1] - values[0]) / values[0]) * 100;

    return { path: pathStr, areaPath: areaStr, change, benchmarkPath: benchmarkStr, isValid: true };
  }, [data, height]);

  if (!isValid) {
    return (
      <div className="flex items-center justify-center text-white/20 text-xs" style={{ height }}>
        Not enough data for simulation
      </div>
    );
  }

  const isPositive = change >= 0;

  return (
    <div className="relative w-full">
      {/* Header Stats */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-white/40 mb-1 font-bold uppercase tracking-wider">{label}</p>
          <span className={`text-2xl font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </span>
        </div>
        {showMetrics && (
          <div className="flex gap-3 text-right">
            {data.sharpeRatio !== undefined && (
              <div>
                <p className="text-[10px] text-white/40 uppercase">Sharpe</p>
                <p className="text-xs font-bold text-white/80">{data.sharpeRatio.toFixed(2)}</p>
              </div>
            )}
            {data.maxDrawdown !== undefined && (
              <div>
                <p className="text-[10px] text-white/40 uppercase">Max DD</p>
                <p className="text-xs font-bold text-red-400">{data.maxDrawdown.toFixed(1)}%</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart SVG */}
      <svg
        viewBox={`0 0 280 ${height - 40}`}
        className="w-full overflow-visible"
        style={{ height: height - 40 }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="backtestGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
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

        {/* Area Fill */}
        <motion.path
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          d={areaPath}
          fill="url(#backtestGradient)"
        />

        {/* Main Line */}
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          d={path}
          fill="none"
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};