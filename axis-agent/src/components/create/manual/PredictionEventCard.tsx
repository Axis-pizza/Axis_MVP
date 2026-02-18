import React, { memo } from 'react';
import { Check } from 'lucide-react';
import { TokenImage } from '../../common/TokenImage';
import { formatCompactUSD } from '../../../utils/formatNumber'; // formatCompactUSDが必要です
import type { JupiterToken } from '../../../services/jupiter';

interface PredictionGroup {
  marketId: string;
  marketQuestion: string;
  eventTitle: string;
  image: string;
  expiry: string;
  totalVolume?: number; // Volumeを追加
  yesToken?: JupiterToken;
  noToken?: JupiterToken;
}

export const PredictionEventCard = memo(
  ({
    group,
    isYesSelected,
    isNoSelected,
    onSelect,
  }: {
    group: PredictionGroup;
    isYesSelected: boolean;
    isNoSelected: boolean;
    onSelect: (token: JupiterToken) => void;
  }) => {
    const yesProb = group.yesToken?.price ? (group.yesToken.price * 100).toFixed(1) : '50.0';
    const noProb = group.noToken?.price ? (group.noToken.price * 100).toFixed(1) : '50.0';

    // 日付を英語表記に変換 (例: Feb 20, 2026)
    const formattedDate = group.expiry
      ? new Date(group.expiry).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

    return (
      <div className="mb-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-all pointer-events-auto">
        {/* イベントヘッダー */}
        <div className="flex gap-4 mb-3">
          <TokenImage src={group.image} className="w-12 h-12 rounded-xl flex-none bg-white/5" />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                {group.eventTitle}
              </div>
              {/* Volume表示 */}
              {group.totalVolume ? (
                <div className="text-[9px] text-white/40 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                  Vol: {formatCompactUSD(group.totalVolume)}
                </div>
              ) : null}
            </div>

            <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
              {group.marketQuestion}
            </h3>

            {/* 期限表示 (英語) */}
            <div className="mt-1.5 text-[10px] text-white/40 flex items-center gap-1">
              <span className="text-white/20">Expires:</span>
              <span className="text-white/60 font-medium font-mono">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* YES / NO 選択ボタン */}
        <div className="grid grid-cols-2 gap-3">
          {group.yesToken && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(group.yesToken!);
              }}
              disabled={isYesSelected}
              className={`relative flex flex-col items-center p-3 rounded-xl border transition-all ${
                isYesSelected
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-black/40 border-white/5 hover:border-white/20 active:scale-95'
              }`}
            >
              <div className="text-[10px] font-black mb-1 text-emerald-400">YES</div>
              <div className="text-lg font-mono font-bold tracking-tighter">{yesProb}%</div>
              {isYesSelected && (
                <div className="absolute top-1 right-1 text-amber-500">
                  <Check size={10} />
                </div>
              )}
            </button>
          )}

          {group.noToken && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(group.noToken!);
              }}
              disabled={isNoSelected}
              className={`relative flex flex-col items-center p-3 rounded-xl border transition-all ${
                isNoSelected
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-black/40 border-white/5 hover:border-white/20 active:scale-95'
              }`}
            >
              <div className="text-[10px] font-black mb-1 text-red-400">NO</div>
              <div className="text-lg font-mono font-bold tracking-tighter">{noProb}%</div>
              {isNoSelected && (
                <div className="absolute top-1 right-1 text-amber-500">
                  <Check size={10} />
                </div>
              )}
            </button>
          )}
        </div>

        {/* 確率バー */}
        <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${yesProb}%` }}
            className="h-full bg-emerald-500/50 transition-all duration-500"
          />
          <div
            style={{ width: `${noProb}%` }}
            className="h-full bg-red-500/50 transition-all duration-500"
          />
        </div>
      </div>
    );
  }
);
