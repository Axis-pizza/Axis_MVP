/**
 * Tactical Terminal - The Directive Input (Step 1)
 * Professional strategy builder with clean iconography
 */

import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  Sparkles, 
  Pizza,
  CircleDot,
  Layers,
  Flame,
  Shield,
  Droplets,
  Hexagon,
  Link,
  FlaskConical,
  Swords,
  Check,
  type LucideIcon
} from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PizzaChart } from '../common/PizzaChart';

// Pizza toppings (strategy ingredients) with icon components
interface Topping {
  id: string;
  label: string;
  Icon: LucideIcon;
  color: string;
  description: string;
}

const TOPPINGS: Topping[] = [
  { id: 'sol', label: 'SOL Base', Icon: CircleDot, color: '#9945FF', description: 'Solana ecosystem core' },
  { id: 'defi', label: 'DeFi Sauce', Icon: Layers, color: '#FF6B35', description: 'Yield protocols' },
  { id: 'meme', label: 'Meme Pepperoni', Icon: Flame, color: '#FF4500', description: 'High-risk meme plays' },
  { id: 'stable', label: 'Cheese Shield', Icon: Shield, color: '#FFB347', description: 'Stablecoin safety' },
  { id: 'lst', label: 'Olive LST', Icon: Droplets, color: '#7CB518', description: 'Liquid staking tokens' },
  { id: 'nft', label: 'Mushroom NFT', Icon: Hexagon, color: '#8B4513', description: 'NFT ecosystem' },
];

interface TacticalTerminalProps {
  onAnalyze: (directive: string, tags: string[]) => void;
  isLoading?: boolean;
}

export const TacticalTerminal = ({ onAnalyze, isLoading }: TacticalTerminalProps) => {
  const { isConnected, shortAddress } = useWallet();
  const { setVisible } = useWalletModal();
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [pizzaReady, setPizzaReady] = useState(false);

  // Preview pizza composition
  const previewSlices = selectedToppings.map((id) => ({
    symbol: TOPPINGS.find(t => t.id === id)?.emoji || '?',
    weight: Math.floor(100 / selectedToppings.length),
    color: TOPPINGS.find(t => t.id === id)?.color,
  }));

  const toggleTopping = (id: string) => {
    setSelectedToppings(prev => {
      const newSelection = prev.includes(id) 
        ? prev.filter(t => t !== id) 
        : [...prev, id].slice(0, 4); // Max 4 toppings
      setPizzaReady(newSelection.length >= 2);
      return newSelection;
    });
  };

  const handleOrder = () => {
    if (!isConnected) {
      setVisible(true);
      return;
    }
    
    const directive = selectedToppings
      .map(id => TOPPINGS.find(t => t.id === id)?.label)
      .join(' + ');
    
    if (selectedToppings.length >= 2) {
      onAnalyze(directive, selectedToppings);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-8 relative overflow-hidden">
      {/* Floating Pizza Decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-4xl"
            initial={{ 
              x: Math.random() * 400, 
              y: -50,
              rotate: 0,
              opacity: 0.3 
            }}
            animate={{ 
              y: '110vh',
              rotate: 360,
            }}
            transition={{ 
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              delay: i * 3,
              ease: 'linear'
            }}
            style={{ left: `${i * 20}%` }}
          >
            🍕
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 relative z-10"
      >
        <motion.div 
          className="inline-block mb-4"
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-6xl">🍕</span>
        </motion.div>
        
        <h1 className="text-4xl font-black mb-2">
          <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
            AXIS
          </span>
        </h1>
        <p className="text-white/50 text-sm">AI Strategy Pizza Factory</p>
        
        {/* Connection Badge */}
        {isConnected ? (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full"
          >
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-400 font-mono">{shortAddress}</span>
          </motion.div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setVisible(true)}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/40 rounded-full hover:bg-orange-500/30 transition-colors"
          >
            <span className="text-xs text-orange-400">🔗 Connect Wallet</span>
          </motion.button>
        )}
      </motion.div>

      {/* Pizza Preview (when toppings selected) */}
      <AnimatePresence>
        {selectedToppings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, height: 0 }}
            animate={{ opacity: 1, scale: 1, height: 'auto' }}
            exit={{ opacity: 0, scale: 0.8, height: 0 }}
            className="flex justify-center mb-6"
          >
            <div className="relative">
              <PizzaChart 
                slices={previewSlices} 
                size={160} 
                showLabels={false} 
                animated={true}
              />
              {/* Ninja hand coming from corner */}
              <motion.div
                className="absolute -bottom-2 -right-2 text-3xl"
                animate={{ rotate: [-10, 10, -10] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                🥷
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-zinc-900/90 to-black/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative z-10 shadow-2xl"
      >
        {/* Order Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Pizza className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Build Your Strategy Pizza</h2>
            <p className="text-xs text-white/40">Choose 2-4 toppings for your perfect mix</p>
          </div>
        </div>

        {/* Toppings Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {TOPPINGS.map((topping, i) => {
            const isSelected = selectedToppings.includes(topping.id);
            return (
              <motion.button
                key={topping.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleTopping(topping.id)}
                className={`relative p-4 rounded-2xl text-left transition-all overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-br from-orange-500/20 to-amber-500/10 border-2 border-orange-500/50'
                    : 'bg-white/5 border border-white/10 hover:border-white/30'
                }`}
              >
                {/* Glow effect when selected */}
                {isSelected && (
                  <motion.div
                    layoutId={`glow-${topping.id}`}
                    className="absolute inset-0 bg-orange-500/10"
                  />
                )}
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{topping.emoji}</span>
                    <span className="font-medium text-sm">{topping.label}</span>
                  </div>
                  <p className="text-[10px] text-white/40">{topping.description}</p>
                </div>

                {/* Selection checkmark */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center"
                  >
                    <span className="text-xs text-black">✓</span>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Selected Summary */}
        {selectedToppings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-5 p-3 bg-white/5 rounded-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Your Order</span>
              <div className="flex gap-1">
                {selectedToppings.map(id => (
                  <span key={id} className="text-lg">
                    {TOPPINGS.find(t => t.id === id)?.emoji}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Order Button */}
        <motion.button
          whileHover={{ scale: pizzaReady ? 1.02 : 1 }}
          whileTap={{ scale: pizzaReady ? 0.98 : 1 }}
          onClick={handleOrder}
          disabled={isLoading || selectedToppings.length < 2}
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
            pizzaReady
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50'
              : 'bg-white/10 text-white/40 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Cooking strategies...</span>
            </>
          ) : !isConnected ? (
            <>
              <span>🔗</span>
              <span>Connect Wallet First</span>
            </>
          ) : selectedToppings.length < 2 ? (
            <>
              <span>🍕</span>
              <span>Select at least 2 toppings</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Generate My Pizza Strategy!</span>
            </>
          )}
        </motion.button>

        {/* Devnet notice */}
        <p className="text-center text-[10px] text-white/30 mt-3">
          🧪 Running on Solana Devnet
        </p>
      </motion.div>

      {/* Fun footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs text-white/20 mt-6"
      >
        Cowabunga! 🐢 Your strategy, your slice.
      </motion.p>
    </div>
  );
};
