import React, { useState, useEffect, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { Check, Plus, Minus, X, Sparkles, Star } from 'lucide-react';
import { TokenImage } from '../../common/TokenImage';
import { formatCompactUSD, abbreviateAddress } from '../../../utils/formatNumber';
import type { JupiterToken } from '../../../services/jupiter';
import type { AssetItem } from './types';

const STEP_AMOUNT = 5;

// --- Mobile Weight Control (Memoized) ---
export const MobileWeightControl = memo(({
  value,
  onChange,
  totalWeight,
}: {
  value: number;
  onChange: (v: number) => void;
  totalWeight: number;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setInputValue(value.toString());
  }, [value, isEditing]);

  const handleChange = (newValue: number) => {
    onChange(Math.max(0, Math.min(100, newValue)));
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const parsed = parseInt(inputValue);
    if (!isNaN(parsed)) handleChange(parsed);
    else setInputValue(value.toString());
  };

  const isOverLimit = totalWeight > 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative h-12 flex items-center">
          <div className="absolute inset-x-0 h-3 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${isOverLimit ? 'bg-red-500' : 'bg-gradient-to-r from-amber-700 to-amber-500'}`}
              animate={{ width: `${Math.min(100, value)}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={value}
            onChange={(e) => handleChange(parseInt(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            animate={{ left: `calc(${Math.min(100, value)}% - 14px)` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className={`w-7 h-7 rounded-full border-2 shadow-lg ${isOverLimit ? 'bg-red-500 border-red-400' : 'bg-amber-500 border-amber-400'}`} />
          </motion.div>
        </div>

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={handleInputBlur}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.blur()}
            className={`w-20 h-12 bg-black/50 border-2 rounded-xl text-center text-xl font-bold outline-none ${isOverLimit ? 'border-red-500 text-red-400' : 'border-amber-600 text-white'}`}
            style={{ fontFamily: '"Times New Roman", serif' }}
            maxLength={3}
            autoFocus
          />
        ) : (
          <button
            onClick={() => { setIsEditing(true); setInputValue(value.toString()); }}
            className={`w-20 h-12 rounded-xl font-bold text-xl transition-all active:scale-95 ${isOverLimit ? 'bg-red-500/20 text-red-400' : 'bg-amber-900/30 text-amber-400'}`}
            style={{ fontFamily: '"Times New Roman", serif' }}
          >
            {value}%
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {[10, 25, 50].map((qv) => (
          <button
            key={qv}
            onClick={() => handleChange(qv)}
            className={`flex-1 h-11 rounded-xl text-sm font-bold transition-all active:scale-95 ${value === qv ? 'bg-amber-600 text-black' : 'bg-white/5 text-white/50 active:bg-white/10'}`}
          >
            {qv}%
          </button>
        ))}
        <div className="w-2" />
        <button onClick={() => handleChange(value - STEP_AMOUNT)} disabled={value <= 0} className="w-12 h-11 rounded-xl bg-white/5 flex items-center justify-center text-white/50 active:bg-red-500/20 active:text-red-400 disabled:opacity-30 transition-all active:scale-95"><Minus size={20} /></button>
        <button onClick={() => handleChange(value + STEP_AMOUNT)} disabled={value >= 100} className="w-12 h-11 rounded-xl bg-white/5 flex items-center justify-center text-white/50 active:bg-green-500/20 active:text-green-400 disabled:opacity-30 transition-all active:scale-95"><Plus size={20} /></button>
      </div>
    </div>
  );
});

// --- Mobile Token List Item (Memoized) ---
export const MobileTokenListItem = memo(({
  token,
  isSelected,
  hasSelection,
  onSelect,
  isFavorite,
  onToggleFavorite,
}: {
  token: JupiterToken;
  isSelected: boolean;
  hasSelection: boolean;
  onSelect: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) => (
  <motion.button
    disabled={isSelected}
    onClick={onSelect}
    initial={{ x: 0, opacity: 1 }}
    animate={{ x: 0, opacity: isSelected ? 1 : hasSelection ? 0.6 : 1 }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
    className={`w-full flex items-center gap-2.5 p-3 rounded-2xl transition-colors min-h-[64px] ${isSelected ? 'bg-gradient-to-r from-amber-950/60 to-amber-900/40 border border-amber-800/40' : 'bg-transparent active:bg-white/5'}`}
  >
    {onToggleFavorite && <div role="button" onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }} className="flex-none w-5 flex items-center justify-center"><Star size={13} className={`transition-colors ${isFavorite ? 'text-amber-500 fill-amber-500' : 'text-white/15'}`} /></div>}
    <div className="relative flex-none">
      <TokenImage src={token.logoURI} className="w-10 h-10 rounded-full bg-white/10" />
      {token.isVerified && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-[#0a0a0a]"><Check size={9} className="text-white" /></div>}
    </div>
    <div className="flex-1 min-w-0 text-left">
      <div className="flex items-center gap-1.5">
        <span className={`font-bold text-sm ${isSelected ? 'text-amber-400' : 'text-white'}`}>{token.symbol}</span>
        {token.tags?.includes('meme') && <Sparkles size={10} className="text-pink-400" />}
        {token.tags?.includes('stable') && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">Stable</span>}
      </div>
      <div className="text-[11px] text-white/30 truncate mt-0.5">{token.name}<span className="text-white/15 mx-1">·</span><span className="font-mono text-white/20">{abbreviateAddress(token.address)}</span></div>
    </div>
    {token.balance != null && token.balance > 0 ? (
      <div className="text-right flex-none min-w-[60px]">
        <div className="text-xs font-mono text-white/80">{token.balance < 0.001 ? '<0.001' : token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
        <div className="text-[10px] text-white/25">Balance</div>
      </div>
    ) : (
      <div className="flex items-center gap-2 flex-none">
        <div className="text-right w-[52px]">
          <div className="text-[9px] text-white/25 uppercase leading-none mb-0.5">MC</div>
          <div className="text-[11px] text-white/50 font-mono leading-none">{formatCompactUSD(token.marketCap)}</div>
        </div>
        <div className="text-right w-[52px]">
          <div className="text-[9px] text-white/25 uppercase leading-none mb-0.5">VOL</div>
          <div className="text-[11px] text-white/50 font-mono leading-none">{formatCompactUSD(token.dailyVolume)}</div>
        </div>
      </div>
    )}
    <div className={`flex-none w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? 'bg-gradient-to-br from-amber-600 to-amber-800' : 'bg-white/5 text-white/30'}`}>{isSelected ? <Check size={14} className="text-white" /> : <Plus size={14} />}</div>
  </motion.button>
), (prev, next) => {
  return prev.token.address === next.token.address && prev.isSelected === next.isSelected && prev.hasSelection === next.hasSelection && prev.isFavorite === next.isFavorite;
});

// --- Mobile Asset Card (Memoized) ---
export const MobileAssetCard = memo(({
  item,
  totalWeight,
  onUpdateWeight,
  onRemove,
}: {
  item: AssetItem;
  totalWeight: number;
  onUpdateWeight: (address: string, value: number) => void;
  onRemove: (address: string) => void;
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.95, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9, x: -50 }}
    className="relative overflow-hidden rounded-3xl border border-amber-900/20"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-amber-950/20" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(180,83,9,0.1),transparent_50%)]" />
    <div className="relative p-5">
      <div className="flex items-center gap-4 mb-5">
        <TokenImage src={item.token.logoURI} className="w-14 h-14 rounded-full flex-none ring-2 ring-amber-900/30" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-lg">{item.token.symbol}</div>
          <div className="text-sm text-white/40 truncate">{item.token.name}</div>
        </div>
        <button onClick={() => onRemove(item.token.address)} className="w-12 h-12 flex items-center justify-center text-white/30 active:text-red-400 active:bg-red-500/10 rounded-2xl transition-colors"><X size={24} /></button>
      </div>
      <MobileWeightControl value={item.weight} onChange={(val) => onUpdateWeight(item.token.address, val)} totalWeight={totalWeight} />
    </div>
  </motion.div>
));