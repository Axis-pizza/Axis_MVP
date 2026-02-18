import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
import { TokenImage } from '../../common/TokenImage';
import { formatCompactUSD } from '../../../utils/formatNumber';
import type { JupiterToken } from '../../../services/jupiter';

export const StockTokenCard = memo(
  ({
    token,
    isSelected,
    onSelect,
  }: {
    token: JupiterToken;
    isSelected: boolean;
    onSelect: () => void;
  }) => {
    return (
      <motion.button
        onClick={onSelect}
        disabled={isSelected}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.95 }}
        className={`relative flex flex-col items-center p-4 rounded-2xl border transition-all h-full ${
          isSelected
            ? 'bg-amber-950/40 border-amber-500/50'
            : 'bg-white/5 border-white/5 hover:border-white/10 active:bg-white/10'
        }`}
      >
        {/* Selection Badge */}
        <div
          className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
            isSelected
              ? 'bg-amber-500 border-amber-500 text-black'
              : 'bg-black/20 border-white/10 text-white/30'
          }`}
        >
          {isSelected ? <Check size={14} /> : <Plus size={14} />}
        </div>

        {/* Logo */}
        <div className="mb-3 relative">
          <TokenImage
            src={token.logoURI}
            className={`w-14 h-14 rounded-full bg-white/10 ${isSelected ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-black' : ''}`}
          />
        </div>

        {/* Info */}
        <div className="text-center w-full">
          <div
            className={`text-lg font-bold truncate mb-0.5 ${isSelected ? 'text-amber-400' : 'text-white'}`}
          >
            {token.symbol}
          </div>
          <div className="text-[10px] text-white/40 truncate w-full px-1">{token.name}</div>
        </div>

        {/* Metrics (Optional: Volume or Price) */}
        <div className="mt-3 pt-3 border-t border-white/5 w-full flex justify-between items-center text-[10px]">
          <div className="text-white/30">Price</div>
          <div className="font-mono text-white/70">
            {/* Priceがあれば表示、なければVolume */}
            {token.price ? `$${token.price.toLocaleString()}` : formatCompactUSD(token.dailyVolume)}
          </div>
        </div>
      </motion.button>
    );
  },
  (prev, next) => prev.isSelected === next.isSelected && prev.token.address === next.token.address
);
