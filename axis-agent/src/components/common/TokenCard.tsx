/**
 * Token Card - Displays a token with price and selection
 */

import { motion } from 'framer-motion';
import { Check, TrendingUp, TrendingDown } from 'lucide-react';
import type { TokenInfo } from '../../types';

interface TokenCardProps {
  token: TokenInfo;
  selected?: boolean;
  onSelect?: (token: TokenInfo) => void;
  showPrice?: boolean;
  compact?: boolean;
}

export const TokenCard = ({ token, selected, onSelect, showPrice = true, compact = false }: TokenCardProps) => {
  const change = token.change24h || 0;
  const isPositive = change >= 0;

  if (compact) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect?.(token)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-xl transition-all
          ${selected 
            ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/50' 
            : 'bg-white/5 border border-white/10 hover:border-white/20'
          }
        `}
      >
        {token.logoURI ? (
          <img src={token.logoURI} alt={token.symbol} className="w-6 h-6 rounded-full" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-[10px] font-bold">
            {token.symbol.charAt(0)}
          </div>
        )}
        <span className="font-medium text-sm">{token.symbol}</span>
        {selected && <Check className="w-4 h-4 text-emerald-400 ml-auto" />}
      </motion.button>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect?.(token)}
      className={`
        relative p-4 rounded-2xl cursor-pointer transition-all overflow-hidden
        ${selected 
          ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10' 
          : 'bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
        }
      `}
    >
      {/* Selection indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-black" />
        </motion.div>
      )}

      <div className="flex items-start gap-3">
        {/* Token Logo */}
        {token.logoURI ? (
          <img src={token.logoURI} alt={token.symbol} className="w-10 h-10 rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center font-bold">
            {token.symbol.charAt(0)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold">{token.symbol}</span>
            {token.sector && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                {token.sector}
              </span>
            )}
          </div>
          <p className="text-xs text-white/40 truncate">{token.name}</p>
        </div>
      </div>

      {showPrice && (
        <div className="mt-3 flex items-end justify-between">
          <span className="text-lg font-bold">
            ${token.priceFormatted || token.price?.toFixed(2) || '—'}
          </span>
          {change !== 0 && (
            <span className={`flex items-center gap-1 text-xs ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? '+' : ''}{change.toFixed(2)}%
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};
