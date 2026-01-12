/**
 * Pizza Chart - Token allocation as pizza slices
 * The core visual of the pizza metaphor
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

// Pizza topping colors (warm, appetizing palette)
const SLICE_COLORS = [
  '#FF6B35', // Pepperoni red-orange
  '#FFB347', // Cheese orange
  '#E8D44D', // Mozzarella yellow
  '#7CB518', // Basil green
  '#F7931E', // Crust golden
  '#C73E1D', // Tomato red
  '#8B4513', // Mushroom brown
  '#FF4500', // Hot pepper
  '#DAA520', // Olive gold
  '#228B22', // Pepper green
];

export const PizzaChart = ({ slices, size = 200, showLabels = true, animated = true }: PizzaChartProps) => {
  const { paths, labels } = useMemo(() => {
    if (!slices.length) return { paths: [], labels: [] };

    const total = slices.reduce((sum, s) => sum + s.weight, 0);
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 8;
    const innerRadius = radius * 0.25; // Small hole in center

    let currentAngle = -90; // Start from top
    const pathsArr: { d: string; color: string; symbol: string; weight: number }[] = [];
    const labelsArr: { x: number; y: number; symbol: string; weight: number }[] = [];

    slices.forEach((slice, i) => {
      const sliceAngle = (slice.weight / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      const midAngle = startAngle + sliceAngle / 2;

      // Convert to radians
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const midRad = (midAngle * Math.PI) / 180;

      // Outer arc points
      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      // Inner arc points
      const x3 = cx + innerRadius * Math.cos(endRad);
      const y3 = cy + innerRadius * Math.sin(endRad);
      const x4 = cx + innerRadius * Math.cos(startRad);
      const y4 = cy + innerRadius * Math.sin(startRad);

      const largeArc = sliceAngle > 180 ? 1 : 0;

      // Path: outer arc -> line to inner -> inner arc -> line back
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

      // Label position (outside the chart)
      const labelRadius = radius + 20;
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
        className="rounded-full border-2 border-dashed border-white/20 flex items-center justify-center"
      >
        <span className="text-white/30 text-sm">Add toppings</span>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: size + 60, height: size + 60 }}>
      <svg
        width={size + 60}
        height={size + 60}
        viewBox={`-30 -30 ${size + 60} ${size + 60}`}
        className="drop-shadow-2xl"
      >
        {/* Pizza crust (outer ring) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 4}
          fill="none"
          stroke="#D4A574"
          strokeWidth="8"
          className="drop-shadow-md"
        />

        {/* Slices */}
        {paths.map((path, i) => (
          <motion.path
            key={path.symbol}
            d={path.d}
            fill={path.color}
            initial={animated ? { scale: 0, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
            className="cursor-pointer drop-shadow-lg"
            style={{ transformOrigin: `${size / 2}px ${size / 2}px` }}
          />
        ))}

        {/* Center circle (cheese pool) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 * 0.22}
          fill="#1a1a1a"
          stroke="#333"
          strokeWidth="2"
        />

        {/* Labels */}
        {showLabels && labels.map((label, i) => (
          <motion.g
            key={label.symbol}
            initial={animated ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.05 }}
          >
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] font-bold fill-white"
            >
              {label.symbol}
            </text>
            <text
              x={label.x}
              y={label.y + 12}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[9px] fill-white/50"
            >
              {label.weight}%
            </text>
          </motion.g>
        ))}
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <span className="text-lg">🍕</span>
        </div>
      </div>
    </div>
  );
};
