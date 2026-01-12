/**
 * Tactical Terminal - The Directive Input (Step 1)
 * Professional strategy builder with clean iconography
 */

import { useState, useMemo } from 'react';
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
  Check,
  Plus,
  type LucideIcon
} from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PizzaChart } from '../common/PizzaChart';
import { ToppingSearchModal } from './ToppingSearchModal';
import type { TokenInfo } from '../../types';

// Pizza toppings (strategy ingredients) with icon components
export interface Topping {
  id: string;
  label: string;
  Icon: LucideIcon;
  color: string;
  description: string;
  image?: string;
}

export const TOPPINGS: Topping[] = [
  { id: 'sol', label: 'SOL Base', Icon: CircleDot, color: '#9945FF', description: 'Solana ecosystem core' },
  { id: 'defi', label: 'DeFi Sauce', Icon: Layers, color: '#FF6B35', description: 'Yield protocols' },
  { id: 'meme', label: 'Meme Pepperoni', Icon: Flame, color: '#FF4500', description: 'High-risk meme plays' },
  { id: 'stable', label: 'Cheese Shield', Icon: Shield, color: '#FFB347', description: 'Stablecoin safety' },
  { id: 'lst', label: 'Olive LST', Icon: Droplets, color: '#7CB518', description: 'Liquid staking tokens' },
  { id: 'nft', label: 'Mushroom NFT', Icon: Hexagon, color: '#8B4513', description: 'NFT ecosystem' },
];

interface TacticalTerminalProps {
  onAnalyze: (directive: string, tags: string[], allToppings: Topping[]) => void;
  isLoading?: boolean;
  customToppings: Topping[];
  setCustomToppings: (toppings: Topping[]) => void;
}

export const TacticalTerminal = ({ 
  onAnalyze, 
  isLoading, 
  customToppings, 
  setCustomToppings 
}: TacticalTerminalProps) => {
  const { isConnected, shortAddress } = useWallet();
  const { setVisible } = useWalletModal();
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [pizzaReady, setPizzaReady] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Combine default and custom toppings
  const allToppings = [...TOPPINGS, ...customToppings];

  // Preview pizza composition
  const previewSlices = selectedToppings.map((id) => {
    const topping = allToppings.find(t => t.id === id);
    return {
      symbol: topping?.label.split(' ')[0] || '?',
      weight: Math.floor(100 / selectedToppings.length),
      color: topping?.color,
    };
  });

  // Stable deterministic values for animations
  const floatingAnimations = useMemo(() => [...Array(5)].map((_, i) => ({
    x: (i * 85) % 350 + 20,
    duration: 15 + (i * 3) % 10
  })), []);

  const toggleTopping = (id: string) => {
    setSelectedToppings(prev => {
      const newSelection = prev.includes(id) 
        ? prev.filter(t => t !== id) 
        : [...prev, id].slice(0, 4); // Max 4 toppings
      setPizzaReady(newSelection.length >= 2);
      return newSelection;
    });
  };

  const handleAddCustomTopping = (token: TokenInfo) => {
    const newTopping: Topping = {
      id: token.address,
      label: token.symbol,
      Icon: CircleDot, // Fallback icon
      image: token.logoURI,
      color: '#ffffff', // Default white for custom tokens
      description: token.name
    };

    setCustomToppings([...customToppings, newTopping]);
    toggleTopping(newTopping.id);
  };

  const handleOrder = () => {
    if (!isConnected) {
      setVisible(true);
      return;
    }
    
    // For custom tokens, we might want to pass the IDs differently, 
    // but the backend AI should handle symbol names in directive well enough.
    const directive = selectedToppings
      .map(id => allToppings.find(t => t.id === id)?.label)
      .join(' + ');
    
    if (selectedToppings.length >= 2) {
      onAnalyze(directive, selectedToppings, allToppings);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-8 relative overflow-hidden">
      <ToppingSearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={handleAddCustomTopping}
        selectedIds={selectedToppings}
      />

      {/* Floating Pizza Decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {floatingAnimations.map((anim, i) => (
          <motion.div
            key={i}
            className="absolute text-orange-500/10"
            initial={{ 
              x: anim.x, 
              y: -50,
              rotate: 0,
              opacity: 0.3 
            }}
            animate={{ 
              y: '110vh',
              rotate: 360,
            }}
            transition={{ 
              duration: anim.duration,
              repeat: Infinity,
              delay: i * 3,
              ease: 'linear'
            }}
            style={{ left: `${i * 20}%` }}
          >
            <Pizza size={48} />
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
          className="inline-block mb-4 text-orange-500"
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Pizza className="w-16 h-16" />
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
            <Link className="w-3 h-3 text-orange-400" />
            <span className="text-xs text-orange-400">Connect Wallet</span>
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
                className="absolute -bottom-2 -right-2 text-3xl text-orange-500"
                animate={{ rotate: [-10, 10, -10] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Sparkles size={24} />
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
          {allToppings.map((topping, i) => {
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
                    {topping.image ? (
                      <img src={topping.image} alt={topping.label} className="w-6 h-6 rounded-full" />
                    ) : (
                      <topping.Icon className={`w-6 h-6 ${isSelected ? 'text-orange-500' : 'text-white/60'}`} />
                    )}
                    <span className="font-medium text-sm truncate">{topping.label}</span>
                  </div>
                  <p className="text-[10px] text-white/40 truncate">{topping.description}</p>
                </div>

                {/* Selection checkmark */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-black" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
          
          {/* Add Custom Topping Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: allToppings.length * 0.05 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsSearchOpen(true)}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/30 border-dashed transition-all gap-2"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Plus className="w-5 h-5 text-white/50" />
            </div>
            <span className="text-xs text-white/50">Add Ingredient</span>
          </motion.button>
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
                {selectedToppings.map(id => {
                  const topping = allToppings.find(t => t.id === id);
                  if (!topping) return null;
                  
                  return topping.image ? (
                    <img key={id} src={topping.image} alt={topping.label} className="w-5 h-5 rounded-full" />
                  ) : (
                    <topping.Icon key={id} className="w-5 h-5 text-orange-400" />
                  );
                })}
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
              <Link className="w-5 h-5" />
              <span>Connect Wallet First</span>
            </>
          ) : selectedToppings.length < 2 ? (
            <>
              <Pizza className="w-5 h-5" />
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
