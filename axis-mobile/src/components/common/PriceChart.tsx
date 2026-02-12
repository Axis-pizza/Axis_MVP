import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
/**
 * Price Chart - Token price history visualization
 */

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../services/api';

interface PriceChartProps {
  tokenAddress: string;
  height?: number;
  showControls?: boolean;
  color?: string;
}

export const PriceChart = ({ tokenAddress, height = 120, showControls = true, color = '#10b981' }: PriceChartProps) => {
  const [data, setData] = useState<{ timestamp: number; price: number }[]>([]);
  const [interval, setInterval] = useState<'1h' | '1d' | '1w'>('1d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await api.getTokenHistory(tokenAddress, interval);
        if (res.success && res.history?.data) {
          setData(res.history.data);
        }
      } catch (e) {
        console.error('Failed to fetch price history:', e);
      } finally {
        setLoading(false);
      }
    };

    if (tokenAddress) {
      fetchHistory();
    }
  }, [tokenAddress, interval]);

  const { path, change, minPrice, maxPrice } = useMemo(() => {
    if (data.length < 2) return { path: '', change: 0, minPrice: 0, maxPrice: 0 };

    const prices = data.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const width = 300;
    const h = height - 20;

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = h - ((d.price - min) / range) * h;
      return `${x},${y}`;
    });

    const change = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;

    return {
      path: `M ${points.join(' L ')}`,
      change,
      minPrice: min,
      maxPrice: max,
    };
  }, [data, height]);

  const isPositive = change >= 0;
  const chartColor = isPositive ? color : '#ef4444';

  if (loading) {
    return (
      <View className="flex items-center justify-center" style={{ height }}>
        <View className="w-8 h-8 border-2 border-white/20 border-t-emerald-500 rounded-full animate-spin" />
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View className="flex items-center justify-center text-white/30 text-sm" style={{ height }}>
        No price data available
      </View>
    );
  }

  return (
    <View className="relative">
      {showControls && (
        <View className="flex items-center justify-between mb-3">
          <View className="flex items-center gap-2">
            <Text className={`text-lg font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{change.toFixed(2)}%
            </Text>
          </View>
          <View className="flex gap-1">
            {(['1h', '1d', '1w'] as const).map((i) => (
              <button
                key={i}
                onPress={() => setInterval(i)}
                className={`px-2 py-1 text-xs rounded-lg transition-all ${
                  interval === i 
                    ? 'bg-white/10 text-white' 
                    : 'text-white/40 hover:text-white'
                }`}
              >
                {i.toUpperCase()}
              </button>
            ))}
          </View>
        </View>
      )}

      <svg
        viewBox={`0 0 300 ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        {/* Gradient fill */}
        <defs>
          <linearGradient id={`chartGradient-${tokenAddress}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <motion.path
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          d={`${path} L 300,${height - 20} L 0,${height - 20} Z`}
          fill={`url(#chartGradient-${tokenAddress})`}
        />

        {/* Line */}
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          d={path}
          fill="none"
          stroke={chartColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {/* Price labels */}
      <View className="absolute right-0 top-0 bottom-5 flex flex-col justify-between text-[10px] text-white/30">
        <Text>${maxPrice.toFixed(2)}</Text>
        <Text>${minPrice.toFixed(2)}</Text>
      </View>
    </View>
  );
};
