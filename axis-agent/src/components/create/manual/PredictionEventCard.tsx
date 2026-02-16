import React, { memo } from 'react';
import { Check } from 'lucide-react';
import { TokenImage } from '../../common/TokenImage';
import type { JupiterToken } from '../../../services/jupiter';

interface PredictionGroup {
  marketId: string;
  marketQuestion: string;
  eventTitle: string;
  image: string;
  expiry: string;
  yesToken?: JupiterToken;
  noToken?: JupiterToken;
}

export const PredictionEventCard = memo(({ 
    group, 
    isYesSelected, 
    isNoSelected,  
    onSelect 
  }: { 
    group: PredictionGroup; 
    isYesSelected: boolean;
    isNoSelected: boolean;
    onSelect: (token: JupiterToken) => void; 
  }) => {
  
  const yesProb = group.yesToken?.price ? (group.yesToken.price * 100).toFixed(1) : "50.0";
  const noProb = group.noToken?.price ? (group.noToken.price * 100).toFixed(1) : "50.0";

  return (
    <div className="mb-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-all pointer-events-auto">
      <div className="flex gap-4 mb-4">
        <TokenImage src={group.image} className="w-12 h-12 rounded-xl flex-none bg-white/5" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mb-1">{group.eventTitle}</div>
          <h3 className="text-sm font-semibold text-white leading-snug">{group.marketQuestion}</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {group.yesToken && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(group.yesToken!); }}
            disabled={isYesSelected}
            className={`relative flex flex-col items-center p-3 rounded-xl border transition-all ${
              isYesSelected 
                ? 'bg-amber-500/20 border-amber-500 text-amber-400' 
                : 'bg-black/40 border-white/5 hover:border-white/20 active:scale-95'
            }`}
          >
            <div className="text-[10px] font-black mb-1 text-emerald-400">YES</div>
            <div className="text-lg font-mono font-bold tracking-tighter">{yesProb}%</div>
            {isYesSelected && <div className="absolute top-1 right-1 text-amber-500"><Check size={10} /></div>}
          </button>
        )}

        {group.noToken && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(group.noToken!); }}
            disabled={isNoSelected}
            className={`relative flex flex-col items-center p-3 rounded-xl border transition-all ${
              isNoSelected 
                ? 'bg-amber-500/20 border-amber-500 text-amber-400' 
                : 'bg-black/40 border-white/5 hover:border-white/20 active:scale-95'
            }`}
          >
            <div className="text-[10px] font-black mb-1 text-red-400">NO</div>
            <div className="text-lg font-mono font-bold tracking-tighter">{noProb}%</div>
            {isNoSelected && <div className="absolute top-1 right-1 text-amber-500"><Check size={10} /></div>}
          </button>
        )}
      </div>
      
      <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden flex">
        <div style={{ width: `${yesProb}%` }} className="h-full bg-emerald-500/50 transition-all duration-500" />
        <div style={{ width: `${noProb}%` }} className="h-full bg-red-500/50 transition-all duration-500" />
      </div>
    </div>
  );
});