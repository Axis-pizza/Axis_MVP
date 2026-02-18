// axis-agent/src/components/common/OGBadge.tsx
import { Crown } from 'lucide-react';

export const OGBadge = ({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) => {
  // サイズごとのスタイル定義
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <div
      className={`
        inline-flex items-center rounded-full font-bold 
        bg-gradient-to-r from-yellow-600/20 to-amber-500/20 
        border border-yellow-500/50 text-yellow-500 
        shadow-[0_0_10px_rgba(234,179,8,0.2)]
        animate-pulse
        ${sizeClasses[size]}
      `}
    >
      <span>VIP</span>
    </div>
  );
};
