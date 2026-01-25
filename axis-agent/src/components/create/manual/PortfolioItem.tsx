import { memo } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, Trash2 } from 'lucide-react';
import { TokenImage } from '../../common/TokenImage';
import { type JupiterToken } from '../../../services/jupiter';

interface AssetItem {
  token: JupiterToken;
  weight: number;
  locked: boolean;
}

interface PortfolioItemProps {
  item: AssetItem;
  numberStyle: React.CSSProperties;
  onUpdateWeight: (address: string, val: number) => void;
  onToggleLock: (address: string) => void;
  onRemove: (address: string) => void;
  triggerHaptic: () => void;
}

// ★ memo化することで、他の行の更新の影響を受けなくなる
export const PortfolioItem = memo(({ 
  item, 
  numberStyle, 
  onUpdateWeight, 
  onToggleLock, 
  onRemove,
  triggerHaptic 
}: PortfolioItemProps) => {
  return (
    <motion.div
      layout="position" // layoutIdだと重くなることがあるのでposition推奨
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -20 }}
      className={`group relative p-4 rounded-2xl border transition-colors ${
        item.locked ? 'bg-white/5 border-orange-500/30' : 'bg-[#0A0A0A] border-white/5'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <TokenImage 
            src={item.token.logoURI} 
            alt={item.token.name} 
            className="w-10 h-10 rounded-full bg-white/10 object-cover" 
          />
          <div>
            <div className="font-bold text-base">{item.token.symbol}</div>
            <div className="text-[10px] text-white/40 truncate max-w-[120px]">{item.token.name}</div>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onToggleLock(item.token.address)} className={`p-2 rounded-full transition-colors ${item.locked ? 'text-orange-400 bg-orange-500/10' : 'text-white/20 hover:text-white'}`}>
            {item.locked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <button onClick={() => onRemove(item.token.address)} className="p-2 rounded-full text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <input
          type="range" min="0" max="100" step="1"
          disabled={item.locked}
          value={item.weight}
          onChange={(e) => {
            // スライダー操作時にHapticを鳴らす
            triggerHaptic();
            onUpdateWeight(item.token.address, parseInt(e.target.value)); 
          }}
          className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500 hover:bg-white/20 transition-colors"
        />
        <div className="w-12 text-right">
          <span className="text-xl font-bold" style={numberStyle}>{item.weight}</span>
          <span className="text-[10px] text-white/40 ml-0.5">%</span>
        </div>
      </div>
    </motion.div>
  );
}, (prev, next) => {
  // 再レンダリング判定のカスタマイズ（厳密にやる場合）
  return (
    prev.item.weight === next.item.weight &&
    prev.item.locked === next.item.locked &&
    prev.item.token.address === next.item.token.address
  );
});