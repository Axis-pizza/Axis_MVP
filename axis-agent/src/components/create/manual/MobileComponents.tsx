import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, Plus, Minus, X, Sparkles, TrendingUp } from 'lucide-react';
import { TokenImage } from '../../common/TokenImage';
import type { JupiterToken } from '../../../services/jupiter';
import type { AssetItem } from './types';

const STEP_AMOUNT = 5;

// --- Mobile Weight Control ---
export const MobileWeightControl = ({
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
            <div className={`w-7 h-7 rounded-full border-2 shadow-lg ${
              isOverLimit ? 'bg-red-500 border-red-400' : 'bg-amber-500 border-amber-400'
            }`} />
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
            className={`w-20 h-12 bg-black/50 border-2 rounded-xl text-center text-xl font-bold outline-none ${
              isOverLimit ? 'border-red-500 text-red-400' : 'border-amber-600 text-white'
            }`}
            style={{ fontFamily: '"Times New Roman", serif' }}
            maxLength={3}
            autoFocus
          />
        ) : (
          <button
            onClick={() => { setIsEditing(true); setInputValue(value.toString()); }}
            className={`w-20 h-12 rounded-xl font-bold text-xl transition-all active:scale-95 ${
              isOverLimit ? 'bg-red-500/20 text-red-400' : 'bg-amber-900/30 text-amber-400'
            }`}
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
            className={`flex-1 h-11 rounded-xl text-sm font-bold transition-all active:scale-95 ${
              value === qv
                ? 'bg-amber-600 text-black'
                : 'bg-white/5 text-white/50 active:bg-white/10'
            }`}
          >
            {qv}%
          </button>
        ))}
        <div className="w-2" />
        <button
          onClick={() => handleChange(value - STEP_AMOUNT)}
          disabled={value <= 0}
          className="w-12 h-11 rounded-xl bg-white/5 flex items-center justify-center text-white/50 active:bg-red-500/20 active:text-red-400 disabled:opacity-30 transition-all active:scale-95"
        >
          <Minus size={20} />
        </button>
        <button
          onClick={() => handleChange(value + STEP_AMOUNT)}
          disabled={value >= 100}
          className="w-12 h-11 rounded-xl bg-white/5 flex items-center justify-center text-white/50 active:bg-green-500/20 active:text-green-400 disabled:opacity-30 transition-all active:scale-95"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
};

// --- Mobile Token List Item ---
export const MobileTokenListItem = ({
  token,
  isSelected,
  hasSelection,
  onSelect,
}: {
  token: JupiterToken;
  isSelected: boolean;
  hasSelection: boolean;
  onSelect: () => void;
}) => (
  <motion.button
    disabled={isSelected}
    onClick={onSelect}
    initial={{ x: 0, opacity: 1 }}
    animate={{
      x: 0,
      opacity: isSelected ? 1 : hasSelection ? 0.5 : 1,
    }}
    whileHover={{ x: 6, opacity: 1 }}
    whileTap={{ scale: 0.98, x: 6 }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-colors min-h-[72px] ${
      isSelected
        ? 'bg-gradient-to-r from-amber-950/60 to-amber-900/40 border border-amber-800/40'
        : 'bg-transparent active:bg-white/5'
    }`}
  >
    <div className="relative flex-none">
      <TokenImage
        src={token.logoURI}
        className="w-12 h-12 rounded-full bg-white/10"
      />
      {token.isVerified && (
        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
          isSelected ? 'bg-gradient-to-br from-amber-600 to-amber-800' : 'bg-blue-500'
        }`}>
          <Check size={12} className="text-white" />
        </div>
      )}
    </div>

    <div className="flex-1 min-w-0 text-left">
      <div className="flex items-center gap-2">
        <span className={`font-semibold text-base ${isSelected ? 'text-amber-500' : 'text-white'}`}>
          {token.symbol}
        </span>
        {token.tags?.includes('meme') && <Sparkles size={12} className="text-pink-400" />}
        {token.tags?.includes('stable') && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Stable</span>
        )}
      </div>
      <div className={`text-sm truncate mt-0.5 ${isSelected ? 'text-amber-600/60' : 'text-white/40'}`}>
        {token.name}
      </div>
    </div>

    <div className="flex flex-col items-end gap-1">
      {token.balance !== undefined && token.balance > 0 && (
         <div className="text-right">
            <div className="text-sm font-mono text-white/90">
              {token.balance < 0.001 ? '<0.001' : token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </div>
            <div className="text-xs text-white/30">Balance</div>
         </div>
      )}
      
      {!token.balance && (
        isSelected ? (
          <div className="flex-none w-11 h-11 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg">
            <Check size={20} className="text-white" />
          </div>
        ) : (
          <div className="flex-none w-11 h-11 rounded-full bg-white/5 flex items-center justify-center text-white/30">
            <Plus size={20} />
          </div>
        )
      )}
    </div>
  </motion.button>
);

// --- Mobile Asset Card ---
export const MobileAssetCard = ({
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
        <button
          onClick={() => onRemove(item.token.address)}
          className="w-12 h-12 flex items-center justify-center text-white/30 active:text-red-400 active:bg-red-500/10 rounded-2xl transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <MobileWeightControl
        value={item.weight}
        onChange={(val) => onUpdateWeight(item.token.address, val)}
        totalWeight={totalWeight}
      />
    </div>
  </motion.div>
);