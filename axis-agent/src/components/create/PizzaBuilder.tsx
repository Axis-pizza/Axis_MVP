/**
 * Pizza Builder - Customize token allocations (Step 2.5)
 * Interactive pizza topping customization with live chart
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, ArrowLeft, Rocket, Trash2 } from 'lucide-react';
import { PizzaChart } from '../common/PizzaChart';

interface TokenAllocation {
  symbol: string;
  weight: number;
  name?: string;
  color?: string;
}

interface PizzaBuilderProps {
  initialTokens: TokenAllocation[];
  onBack: () => void;
  onDeploy: (tokens: TokenAllocation[], name: string, description?: string) => void;
}

export const PizzaBuilder = ({ initialTokens, onBack, onDeploy }: PizzaBuilderProps) => {
  const [tokens, setTokens] = useState<TokenAllocation[]>(initialTokens);
  const [pizzaName, setPizzaName] = useState('My Alpha Pizza');
  const [description, setDescription] = useState('');

  const adjustWeight = (symbol: string, delta: number) => {
    setTokens(prev => {
      const updated = prev.map(t => {
        if (t.symbol === symbol) {
          return { ...t, weight: Math.max(5, Math.min(80, t.weight + delta)) };
        }
        return t;
      });

      // Normalize to 100%
      const total = updated.reduce((sum, t) => sum + t.weight, 0);
      if (Math.abs(total - 100) > 1) {
        const scale = 100 / total;
        return updated.map(t => ({ ...t, weight: Math.round(t.weight * scale) }));
      }
      return updated;
    });
  };

  const removeToken = (symbol: string) => {
    if (tokens.length <= 1) return;
    setTokens(prev => {
      const filtered = prev.filter(t => t.symbol !== symbol);
      // Redistribute weight
      const removedWeight = prev.find(t => t.symbol === symbol)?.weight || 0;
      const perToken = Math.floor(removedWeight / filtered.length);
      return filtered.map((t, i) => ({
        ...t,
        weight: t.weight + perToken + (i === 0 ? removedWeight % filtered.length : 0),
      }));
    });
  };

  const totalWeight = tokens.reduce((sum, t) => sum + t.weight, 0);

  return (
    <div className="min-h-screen px-4 py-6 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold">Build Your Pizza</h2>
          <p className="text-xs text-white/50">Adjust the toppings to your taste</p>
        </div>
      </div>

      {/* Pizza Name Input */}
      <div className="mb-4">
        <label className="text-xs text-white/50 mb-1 block">Pizza Name</label>
        <input
          type="text"
          value={pizzaName}
          onChange={(e) => setPizzaName(e.target.value)}
          className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-bold text-lg focus:outline-none focus:border-orange-500/50"
          placeholder="Enter your pizza name..."
        />
      </div>

      {/* Optional Description */}
      <div className="mb-6">
        <label className="text-xs text-white/50 mb-1 block">
          Description <span className="text-white/30">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-500/50 resize-none"
          placeholder="Share your strategy thesis... (visible in Discover)"
          rows={2}
          maxLength={280}
        />
        <div className="text-right text-xs text-white/30 mt-1">{description.length}/280</div>
      </div>

      {/* Pizza Chart - Centered */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex justify-center mb-6"
      >
        <PizzaChart slices={tokens} size={220} showLabels={true} />
      </motion.div>

      {/* Weight Indicator */}
      <div className="flex justify-center mb-6">
        <div className={`px-4 py-2 rounded-full text-sm font-medium ${
          totalWeight === 100 
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
        }`}>
          Total: {totalWeight}% {totalWeight === 100 ? '✓' : `(${totalWeight > 100 ? '-' : '+'}${Math.abs(100 - totalWeight)}%)`}
        </div>
      </div>

      {/* Token Sliders */}
      <div className="space-y-3 max-w-md mx-auto">
        {tokens.map((token, i) => (
          <motion.div
            key={token.symbol}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10"
          >
            {/* Token Icon */}
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg"
              style={{ backgroundColor: token.color || `hsl(${i * 60}, 70%, 50%)` }}
            >
              {token.symbol.slice(0, 2)}
            </div>

            {/* Token Info + Slider */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{token.symbol}</span>
                <span className="text-lg font-bold">{token.weight}%</span>
              </div>
              
              {/* Custom Slider Track */}
              <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{ 
                    backgroundColor: token.color || `hsl(${i * 60}, 70%, 50%)`,
                    width: `${token.weight}%`
                  }}
                  layout
                />
              </div>
            </div>

            {/* Adjust Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => adjustWeight(token.symbol, -5)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={() => adjustWeight(token.symbol, 5)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => removeToken(token.symbol)}
                className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Deploy Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-24 left-4 right-4 max-w-md mx-auto"
      >
        <button
          onClick={() => onDeploy(tokens, pizzaName, description || undefined)}
          disabled={totalWeight !== 100 || !pizzaName.trim()}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl font-bold text-black flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Rocket className="w-5 h-5" />
          Deploy to Solana
        </button>
      </motion.div>
    </div>
  );
};

