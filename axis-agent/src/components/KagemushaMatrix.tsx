import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const TEXT_LINES = [
  'INITIALIZING QUANT ENGINE...',
  'CONNECTING TO PYTH HERMES V2...',
  'FETCHING SOLANA TOKEN MAP...',
  'ANALYZING 50,000 CONTRACTS...',
  'CALCULATING ALPHA FACTORS...',
  'DETECTING LIQUIDITY POOLS...',
  'OPTIMIZING ROUTES VIA JUPITER...',
  'GENERATING STRATEGIC VECTORS...',
];

export const KagemushaMatrix = ({ onComplete }: { onComplete: () => void }) => {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex >= TEXT_LINES.length) {
        clearInterval(interval);
        setTimeout(onComplete, 800);
        return;
      }
      setLines((prev) => [...prev, TEXT_LINES[currentIndex]]);
      currentIndex++;
    }, 300); // Speed of matrix lines

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center font-mono text-green-500 overflow-hidden">
      <div className="w-full max-w-md p-6 relative">
        {/* Matrix Rain Effect (Simplified) */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-900/10 to-transparent animate-pulse pointer-events-none" />

        <div className="space-y-2">
          {lines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs md:text-sm tracking-widest border-l-2 border-green-500 pl-3 opacity-80"
            >
              {`> ${line}`}
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-8 h-1 bg-green-900/30 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-full bg-green-500 shadow-[0_0_10px_#22c55e]"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 3, ease: 'linear' }}
          />
        </motion.div>
      </div>
    </div>
  );
};
