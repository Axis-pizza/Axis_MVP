/**
 * BacktestLoadingAnimation - Animated loading screen during strategy generation
 * Shows pizza cooking animation with progress messages
 */

import { motion } from 'framer-motion';
import { Pizza, Sparkles, TrendingUp, BarChart3, Flame } from 'lucide-react';
import { useState, useEffect } from 'react';

const LOADING_MESSAGES = [
  { icon: BarChart3, text: 'Analyzing market data...', color: 'text-blue-400' },
  { icon: TrendingUp, text: 'Running backtests...', color: 'text-emerald-400' },
  { icon: Sparkles, text: 'Optimizing allocation...', color: 'text-purple-400' },
  { icon: Flame, text: 'Cooking your pizza...', color: 'text-orange-400' },
];

export const BacktestLoadingAnimation = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Cycle through messages
    const msgInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    // Progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 15, 95));
    }, 500);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const currentMessage = LOADING_MESSAGES[messageIndex];
  const Icon = currentMessage.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {/* Animated Pizza */}
      <div className="relative mb-8">
        {/* Outer glow */}
        <motion.div
          className="absolute inset-0 bg-orange-500/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        {/* Pizza spinning */}
        <motion.div
          className="relative w-32 h-32 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <Pizza className="w-24 h-24 text-orange-500" />
        </motion.div>

        {/* Floating sparkles */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{
              x: [0, (i - 1) * 30],
              y: [0, -60],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.5,
            }}
            style={{ top: '50%', left: '50%' }}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
          </motion.div>
        ))}
      </div>

      {/* Message */}
      <motion.div
        key={messageIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-3 mb-6"
      >
        <Icon className={`w-5 h-5 ${currentMessage.color}`} />
        <span className="text-lg font-medium">{currentMessage.text}</span>
      </motion.div>

      {/* Progress bar */}
      <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Tip */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="text-xs text-white/30 mt-8 text-center max-w-xs"
      >
        💡 AI is analyzing historical data to find the optimal allocation for your strategy
      </motion.p>
    </div>
  );
};
