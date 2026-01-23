import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../../services/api';

interface ChartData {
  time: number;
  value: number;
}

interface StrategyChartProps {
  strategyId: string;
  refreshTrigger?: number; // 更新トリガー
}

const TIMEFRAMES = [
  { label: '1D', value: '1d' },
  { label: '1W', value: '7d' },
  { label: '1M', value: '30d' },
];

export const StrategyChart = ({ strategyId, refreshTrigger }: StrategyChartProps) => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [error, setError] = useState(false);
  const [latestValue, setLatestValue] = useState<number | null>(null);
  const [startValue, setStartValue] = useState<number | null>(null);

  useEffect(() => {
    const fetchChart = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await api.getStrategyChart(strategyId, period);
        if (res.success && res.data && res.data.length > 0) {
          setData(res.data);
          setStartValue(res.data[0].value);
          setLatestValue(res.data[res.data.length - 1].value);
        } else {
          setError(true);
        }
      } catch (e) {
        console.error("Chart fetch error", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (strategyId) {
      fetchChart();
    }
  }, [strategyId, period, refreshTrigger]);

  // パフォーマンス計算 (NAV 100スタートなので、現在値 - 100 がそのまま%になる)
  const percentChange = latestValue ? latestValue - 100 : 0;
  const isPositive = percentChange >= 0;

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label * 1000);
      const val = payload[0].value;
      // 基準値(100)からの変動率を表示
      const pnl = val - 100;
      
      return (
        <div className="bg-[#1C1917]/90 backdrop-blur-md border border-white/10 p-2 rounded-lg shadow-xl text-xs">
          <p className="text-white/50 mb-1">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="font-bold text-white text-sm">
            ${val.toFixed(2)} 
            <span className={`ml-2 ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ({pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%)
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading && data.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center bg-white/5 rounded-2xl border border-white/5">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 w-full flex flex-col items-center justify-center bg-white/5 rounded-2xl border border-white/5 text-white/30">
        <TrendingDown className="w-8 h-8 mb-2" />
        <p className="text-xs">Chart data unavailable</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header Stats */}
      <div className="flex items-end justify-between mb-4 px-2">
        <div>
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-1">Performance</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-white">
              {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%
            </span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {TIMEFRAMES.find(t => t.value === period)?.label}
            </span>
          </div>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setPeriod(tf.value)}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                period === tf.value 
                  ? 'bg-white/10 text-white shadow-sm' 
                  : 'text-white/30 hover:text-white/60'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-64 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? '#10B981' : '#EF4444'} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={isPositive ? '#10B981' : '#EF4444'} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
            <XAxis 
              dataKey="time" 
              hide 
              domain={['dataMin', 'dataMax']} 
              type="number" 
            />
            <YAxis 
              hide 
              domain={['auto', 'auto']} 
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={isPositive ? '#10B981' : '#EF4444'} 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorValue)" 
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};