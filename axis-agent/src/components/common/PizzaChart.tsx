/**
 * Pizza Chart - Token allocation as pizza slices
 * Refined for "High-End Artisan / Private Banking" aesthetic
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Slice {
  symbol: string;
  weight: number;
  color?: string;
}

interface PizzaChartProps {
  slices: Slice[];
  size?: number;
  showLabels?: boolean;
  animated?: boolean;
}

// Artisan / Luxury Palette
// 落ち着いたゴールド、ブロンズ、深みのある食材の色を使用
const SLICE_COLORS = [
  '#D97706', // Bronze (Amber 600)
  '#B45309', // Deep Bronze (Amber 700)
  '#9F1239', // Wine / Cured Meat (Rose 700)
  '#15803D', // Deep Basil (Green 700)
  '#854D0E', // Old Gold (Yellow 800)
  '#78350F', // Truffle / Mushroom (Amber 900)
  '#BE123C', // Raspberry / Rare Meat (Rose 700)
  '#0F766E', // Deep Teal (Emerald 700)
];

export const PizzaChart = ({ slices, size = 200, showLabels = true, animated = true }: PizzaChartProps) => {
  const { paths, labels } = useMemo(() => {
    if (!slices.length) return { paths: [], labels: [] };

    const total = slices.reduce((sum, s) => sum + s.weight, 0);
    const cx = size / 2;
    const cy = size / 2;
    // クラスト（外枠）の分少し内側に
    const radius = size / 2 - 10;
    const innerRadius = radius * 0.25; // 中央の穴

    let currentAngle = -90; // 12時の方向から開始
    const pathsArr: { d: string; color: string; symbol: string; weight: number }[] = [];
    const labelsArr: { x: number; y: number; symbol: string; weight: number }[] = [];

    slices.forEach((slice, i) => {
      const sliceAngle = (slice.weight / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      const midAngle = startAngle + sliceAngle / 2;

      // ラジアン変換
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const midRad = (midAngle * Math.PI) / 180;

      // 外周の点
      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      // 内周の点
      const x3 = cx + innerRadius * Math.cos(endRad);
      const y3 = cy + innerRadius * Math.sin(endRad);
      const x4 = cx + innerRadius * Math.cos(startRad);
      const y4 = cy + innerRadius * Math.sin(startRad);

      const largeArc = sliceAngle > 180 ? 1 : 0;

      // Path生成: 外周円弧 -> 内周への直線 -> 内周円弧 -> 外周への直線
      const d = `
        M ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
        L ${x3} ${y3}
        A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
        Z
      `;

      pathsArr.push({
        d,
        color: slice.color || SLICE_COLORS[i % SLICE_COLORS.length],
        symbol: slice.symbol,
        weight: slice.weight,
      });

      // ラベル位置（チャートの外側）
      const labelRadius = radius + 24;
      labelsArr.push({
        x: cx + labelRadius * Math.cos(midRad),
        y: cy + labelRadius * Math.sin(midRad),
        symbol: slice.symbol,
        weight: slice.weight,
      });

      currentAngle = endAngle;
    });

    return { paths: pathsArr, labels: labelsArr };
  }, [slices, size]);

  if (!slices.length) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full border border-dashed border-[#D97706]/30 flex items-center justify-center bg-[#0C0A09]"
      >
        <span className="text-[#D97706]/50 text-sm font-serif italic">Select Assets</span>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: size + 80, height: size + 80 }}>
      <svg
        width={size + 80}
        height={size + 80}
        viewBox={`-40 -40 ${size + 80} ${size + 80}`}
        className="overflow-visible"
      >
        <defs>
          {/* 高級感を出すためのドロップシャドウフィルター */}
          <filter id="shadow-slice" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
          </filter>
          {/* ゴールドの光沢グラデーション */}
          <linearGradient id="crustGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
        </defs>

        {/* Pizza crust (Outer Rim) - 金の縁取り */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 4}
          fill="none"
          stroke="url(#crustGradient)"
          strokeWidth="1"
          strokeOpacity="0.8"
          className="drop-shadow-lg"
        />
        
        {/* 背景の皿/ベース */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 10}
          fill="#1C1917" // Very dark warm gray
          opacity="0.5"
        />

        {/* Slices */}
        {paths.map((path, i) => (
          <motion.path
            key={path.symbol}
            d={path.d}
            fill={path.color}
            stroke="#0C0A09" // 境界線を背景色にしてスライスを際立たせる
            strokeWidth="1.5"
            filter="url(#shadow-slice)"
            initial={animated ? { scale: 0.8, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 0.9 }} // わずかに透過させてガラス感を出す
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 100, damping: 20 }}
            whileHover={{ 
              scale: 1.05, 
              opacity: 1,
              filter: 'brightness(1.2) drop-shadow(0 0 8px rgba(217, 119, 6, 0.5))',
              zIndex: 10
            }}
            className="cursor-pointer"
            style={{ transformOrigin: `${size / 2}px ${size / 2}px` }}
          />
        ))}

        {/* Center circle (Hole/Void) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 * 0.22}
          fill="#0C0A09"
          stroke="#D97706"
          strokeWidth="0.5"
          strokeOpacity="0.3"
        />

        {/* Labels */}
        {showLabels && labels.map((label, i) => (
          <motion.g
            key={label.symbol}
            initial={animated ? { opacity: 0, y: 5 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.05 }}
          >
            {/* 接続線 (Connector Line) */}
            <line 
                x1={size/2 + (size/2 - 10) * Math.cos(Math.atan2(label.y - size/2, label.x - size/2))}
                y1={size/2 + (size/2 - 10) * Math.sin(Math.atan2(label.y - size/2, label.x - size/2))}
                x2={label.x}
                y2={label.y}
                stroke="#D97706"
                strokeWidth="0.5"
                strokeOpacity="0.3"
            />
            
            <text
              x={label.x}
              y={label.y - 4}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[11px] font-serif font-bold fill-[#E7E5E4] drop-shadow-md"
              style={{ fontFamily: '"Times New Roman", serif' }}
            >
              {label.symbol}
            </text>
            <text
              x={label.x}
              y={label.y + 8}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] font-serif fill-[#D97706]"
              style={{ fontFamily: '"Times New Roman", serif' }}
            >
              {label.weight}%
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  );
};