import { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';
import { CandlestickChart as CandleIcon, LineChart as LineIcon } from 'lucide-react';

interface RichChartProps {
  data: any[]; 
  type: 'line' | 'candle';
  isPositive: boolean;
  onTypeChange: (type: 'line' | 'candle') => void;
}

export const RichChart = ({ data, type, isPositive, onTypeChange }: RichChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. チャート作成
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#78716C',
        fontFamily: "'Times New Roman', Times, serif",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
      },
      localization: {
        locale: 'en-US', 
        dateFormat: 'yyyy/MM/dd', // お好みでフォーマット調整
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.1)' },
    });

    // 🔍 デバッグログ: チャートオブジェクトの中身を確認
    console.log("🔍 Chart Object Created:", chart);
    console.log("🔍 Available Methods:", Object.keys(chart || {}));
    console.log("🔍 Check addAreaSeries:", typeof (chart as any).addAreaSeries);

    // 2. シリーズ追加
    const mainColor = isPositive ? '#10B981' : '#EF4444';
    let series: any;

    try {
      if (type === 'line') {
        // 関数が存在するかチェックしてから実行
        if (typeof (chart as any).addAreaSeries === 'function') {
          series = chart.addAreaSeries({
            lineColor: mainColor,
            topColor: isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            bottomColor: 'rgba(0, 0, 0, 0)',
            lineWidth: 2,
          });
        } else {
          console.error("❌ Critical: chart.addAreaSeries is missing! Lib version issue?");
        }
      } else {
        if (typeof (chart as any).addCandlestickSeries === 'function') {
          series = chart.addCandlestickSeries({
            upColor: '#10B981',
            downColor: '#EF4444',
            borderVisible: false,
            wickUpColor: '#10B981',
            wickDownColor: '#EF4444',
          });
        }
      }

      if (series && data && data.length > 0) {
        const sortedData = [...data]
          .sort((a, b) => (a.time as number) - (b.time as number))
          .filter((v, i, a) => i === 0 || v.time !== a[i - 1].time);
        
        series.setData(sortedData);
        chart.timeScale().fitContent();
      }
    } catch (e) {
      console.error("Chart Error:", e);
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, type, isPositive]);

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10 flex gap-1 bg-black/50 backdrop-blur-sm p-1 rounded-lg border border-white/5">
        <button 
          onClick={() => onTypeChange('line')}
          className={`p-1.5 rounded-md transition-colors ${type === 'line' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
        >
          <LineIcon className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onTypeChange('candle')}
          className={`p-1.5 rounded-md transition-colors ${type === 'candle' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
        >
          <CandleIcon className="w-4 h-4" />
        </button>
      </div>
      <div ref={chartContainerRef} className="w-full h-[300px]" />
    </div>
  );
};