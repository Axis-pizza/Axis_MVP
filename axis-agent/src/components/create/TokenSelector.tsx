/**
 * Token Selector - Modern token selection with search
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Plus, Minus } from 'lucide-react';
import { TokenCard } from '../common/TokenCard';
import { fetchSolanaTokens } from '../../services/coingecko';
import type { TokenInfo, TokenAllocation } from '../../types';

interface TokenSelectorProps {
  selectedTokens: TokenAllocation[];
  onUpdate: (tokens: TokenAllocation[]) => void;
  maxTokens?: number;
}

export const TokenSelector = ({ selectedTokens, onUpdate, maxTokens = 5 }: TokenSelectorProps) => {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const tokens = await fetchSolanaTokens();
        setTokens(tokens);
      } catch (e) {
        console.error('Failed to fetch tokens:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchTokens();
  }, []);

  const filteredTokens = tokens.filter(t =>
    t.symbol.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (token: TokenInfo) => {
    const existing = selectedTokens.find(t => t.symbol === token.symbol);
    
    if (existing) {
      // Remove if already selected
      onUpdate(selectedTokens.filter(t => t.symbol !== token.symbol));
    } else if (selectedTokens.length < maxTokens) {
      // Add with default weight
      const remainingWeight = 100 - selectedTokens.reduce((sum, t) => sum + t.weight, 0);
      const newWeight = Math.min(remainingWeight, Math.floor(100 / (selectedTokens.length + 1)));
      
      onUpdate([...selectedTokens.map(t => ({
        ...t,
        weight: Math.floor(t.weight * (1 - newWeight / 100))
      })), {
        symbol: token.symbol,
        weight: newWeight,
        address: token.address,
        token,
      }]);
    }
  };

  const handleWeightChange = (symbol: string, delta: number) => {
    const updated = selectedTokens.map(t => {
      if (t.symbol === symbol) {
        return { ...t, weight: Math.max(5, Math.min(95, t.weight + delta)) };
      }
      return t;
    });
    
    // Normalize to 100%
    const total = updated.reduce((sum, t) => sum + t.weight, 0);
    if (total !== 100) {
      const scale = 100 / total;
      for (const t of updated) {
        t.weight = Math.round(t.weight * scale);
      }
      // Fix rounding
      const newTotal = updated.reduce((sum, t) => sum + t.weight, 0);
      if (newTotal !== 100 && updated.length > 0) {
        updated[0].weight += (100 - newTotal);
      }
    }
    
    onUpdate(updated);
  };

  return (
    <div className="space-y-6">
      {/* Selected Tokens with Weight Sliders */}
      {selectedTokens.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white/60">Your Portfolio</h3>
          {selectedTokens.map((allocation, i) => (
            <motion.div
              key={allocation.symbol}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/10"
            >
              {/* Token Info */}
              <div className="flex items-center gap-3 flex-1">
                {allocation.token?.logoURI ? (
                  <img 
                    src={allocation.token.logoURI} 
                    alt={allocation.symbol}
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div 
                  className={`w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-xs font-bold ${allocation.token?.logoURI ? 'hidden' : ''}`}
                >
                  {allocation.symbol.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-sm">{allocation.symbol}</p>
                  <p className="text-[10px] text-white/40">{allocation.token?.name || allocation.symbol}</p>
                </div>
              </div>

              {/* Weight Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleWeightChange(allocation.symbol, -5)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                
                <div className="w-16 text-center">
                  <span className="text-lg font-bold">{allocation.weight}</span>
                  <span className="text-white/40 text-sm">%</span>
                </div>
                
                <button
                  onClick={() => handleWeightChange(allocation.symbol, 5)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Remove */}
              <button
                onClick={() => onUpdate(selectedTokens.filter(t => t.symbol !== allocation.symbol))}
                className="w-8 h-8 rounded-full hover:bg-red-500/20 flex items-center justify-center text-white/40 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
          
          {/* Total indicator */}
          <div className="flex justify-between text-xs px-2">
            <span className="text-white/40">Total Allocation</span>
            <span className={`font-bold ${
              selectedTokens.reduce((s, t) => s + t.weight, 0) === 100 
                ? 'text-emerald-400' 
                : 'text-orange-400'
            }`}>
              {selectedTokens.reduce((s, t) => s + t.weight, 0)}%
            </span>
          </div>
        </div>
      )}

      {/* Search & Add More */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tokens..."
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-white/30 hover:text-white" />
            </button>
          )}
        </div>

        {/* Token Grid */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-white/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
            <AnimatePresence>
              {filteredTokens.slice(0, 20).map((token, i) => (
                <motion.div
                  key={token.symbol}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <TokenCard
                    token={token}
                    selected={selectedTokens.some(t => t.symbol === token.symbol)}
                    onSelect={handleSelect}
                    showPrice={true}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
