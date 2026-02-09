import { motion } from 'framer-motion';

export const MiniChart = ({ isPositive, intensity }: { isPositive: boolean, intensity: number }) => {
  const color = isPositive ? "#10B981" : "#EF4444";
  const opacity = Math.min(0.3 + intensity / 100, 0.8); // 変動が激しいほど光る

  return (
    <div className="relative w-full h-24 mt-2 mb-4">
      <svg viewBox="0 0 200 60" className="w-full h-full overflow-visible">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <motion.path
          d="M0,45 Q20,35 40,50 T80,25 T120,45 T160,15 T200,30" // デモ用ランダムパス
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: opacity }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        {/* 背景のグラデーション */}
        <path d="M0,45 Q20,35 40,50 T80,25 T120,45 T160,15 T200,30 V60 H0 Z" fill={`url(#grad-${isPositive ? 'up' : 'down'})`} opacity="0.1" />
        <linearGradient id="grad-up" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" /><stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </svg>
    </div>
  );
};