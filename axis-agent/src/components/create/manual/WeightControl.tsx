/**
 * WeightControl - 全部盛りの比重調整コンポーネント
 *
 * 機能:
 * - スライダー（ドラッグで調整）
 * - 数値表示（タップで直接入力）
 * - クイックボタン（10%, 25%, 50% プリセット）
 * - ステッパー（±5% ボタン）
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';

interface WeightControlProps {
  value: number;
  onChange: (value: number) => void;
  totalWeight: number;
  disabled?: boolean;
}

const QUICK_VALUES = [10, 25, 50];
const STEP_AMOUNT = 1;

export const WeightControl = ({
  value,
  onChange,
  totalWeight,
  disabled = false,
}: WeightControlProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  // 外部からの値変更に追従
  useEffect(() => {
    if (!isEditing) {
      setInputValue(value.toString());
    }
  }, [value, isEditing]);

  const handleChange = (newValue: number) => {
    if (disabled) return;
    onChange(Math.max(0, Math.min(100, newValue)));
  };

  const handleIncrement = () => handleChange(value + STEP_AMOUNT);
  const handleDecrement = () => handleChange(value - STEP_AMOUNT);
  const handleQuickSet = (val: number) => handleChange(val);

  const handleInputFocus = () => {
    if (disabled) return;
    setIsEditing(true);
    setInputValue(value.toString());
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const parsed = parseInt(inputValue);
    if (!isNaN(parsed)) {
      handleChange(parsed);
    } else {
      setInputValue(value.toString());
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setInputValue(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setInputValue(value.toString());
      setIsEditing(false);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement();
    }
  };

  const isOverLimit = totalWeight > 100;
  const barColor = isOverLimit ? 'bg-red-500' : value === 0 ? 'bg-white/20' : 'bg-orange-500';
  const textColor = isOverLimit ? 'text-red-400' : 'text-white';

  return (
    <div className="space-y-3">
      {/* Row 1: Slider + Value Display */}
      <div className="flex items-center gap-3">
        {/* Slider */}
        <div className="flex-1 relative h-10 flex items-center">
          {/* Track Background */}
          <div className="absolute inset-x-0 h-2 bg-white/10 rounded-full overflow-hidden">
            {/* Filled Track */}
            <motion.div
              className={`h-full rounded-full ${barColor}`}
              initial={false}
              animate={{ width: `${Math.min(100, value)}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>

          {/* Native Range Input (invisible but functional) */}
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={value}
            onChange={(e) => handleChange(parseInt(e.target.value))}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />

          {/* Custom Thumb */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            initial={false}
            animate={{ left: `calc(${Math.min(100, value)}% - 10px)` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 shadow-lg ${
                isOverLimit ? 'bg-red-500 border-red-400' : 'bg-orange-500 border-orange-400'
              }`}
            />
          </motion.div>
        </div>

        {/* Value Display / Input */}
        <div className="flex-none w-16">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              className={`w-full h-10 bg-black/50 border-2 rounded-xl text-center text-lg font-bold outline-none ${
                isOverLimit ? 'border-red-500 text-red-400' : 'border-orange-500 text-white'
              }`}
              maxLength={3}
              autoFocus
            />
          ) : (
            <button
              onClick={handleInputFocus}
              disabled={disabled}
              className={`w-full h-10 rounded-xl font-mono font-bold text-lg transition-all ${textColor} ${
                disabled
                  ? 'bg-white/5 cursor-not-allowed'
                  : 'bg-white/10 hover:bg-white/15 active:scale-95'
              }`}
            >
              {value}%
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Quick Buttons + Stepper */}
      <div className="flex items-center gap-2">
        {/* Quick Value Buttons */}
        <div className="flex gap-1.5">
          {QUICK_VALUES.map((qv) => (
            <button
              key={qv}
              onClick={() => handleQuickSet(qv)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                value === qv
                  ? 'bg-orange-500 text-white'
                  : disabled
                    ? 'bg-white/5 text-white/20 cursor-not-allowed'
                    : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white active:scale-95'
              }`}
            >
              {qv}%
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stepper Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleDecrement}
            disabled={disabled || value <= 0}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              disabled || value <= 0
                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                : 'bg-white/10 text-white/60 hover:bg-red-500/20 hover:text-red-400 active:scale-95'
            }`}
          >
            <Minus size={12} />
            <span>{STEP_AMOUNT}</span>
          </button>

          <button
            onClick={handleIncrement}
            disabled={disabled || value >= 100}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              disabled || value >= 100
                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                : 'bg-white/10 text-white/60 hover:bg-green-500/20 hover:text-green-400 active:scale-95'
            }`}
          >
            <Plus size={12} />
            <span>{STEP_AMOUNT}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeightControl;
