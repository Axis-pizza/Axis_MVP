import { useState } from 'react';
import { Play, Loader2, AlertTriangle, Terminal } from 'lucide-react';
import { RichChart } from '../../common/RichChart';
import { GeckoTerminalService } from '../../../services/geckoterminal';

interface TokenConfig {
  symbol: string;
  weight: number;
  address?: string;
}

interface BacktestSimulationProps {
  tokens: TokenConfig[];
}

const TerminalLog = ({ logs }: { logs: string[] }) => (
  <div className="font-mono text-xs text-green-500/80 space-y-1 p-4 bg-black/50 rounded-lg border border-white/5 h-32 overflow-y-auto custom-scrollbar">
    {logs.map((log, i) => (
      <div key={i} className="flex items-center gap-2">
        <span className="text-green-500/40">{'>'}</span>
        <span>{log}</span>
      </div>
    ))}
  </div>
);

export const BacktestSimulation = ({ tokens }: BacktestSimulationProps) => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [chartData, setChartData] = useState<any[]>([]);
  const [hasRun, setHasRun] = useState(false);
  
  const [stats, setStats] = useState({ 
    totalReturn: 0, 
    volatility: 0, 
    sharpeRatio: 0,
    maxDrawdown: 0 
  });

  const SOL_MINT = "So11111111111111111111111111111111111111112";
  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  // データ補間 (見た目を滑らかにするためだけに使用。アニメーション用ではない)
  const interpolateData = (data: any[], stepsPerDay: number = 4) => {
    if (data.length < 2) return data;
    const interpolated: any[] = [];
    for (let i = 0; i < data.length - 1; i++) {
      const current = data[i];
      const next = data[i + 1];
      const timeStep = (next.time - current.time) / stepsPerDay;
      const valueStep = (next.value - current.value) / stepsPerDay;
      
      for (let j = 0; j < stepsPerDay; j++) {
        interpolated.push({
          time: current.time + (timeStep * j),
          value: current.value + (valueStep * j),
        });
      }
    }
    interpolated.push(data[data.length - 1]);
    return interpolated;
  };

  const runSimulation = async () => {
    if (tokens.length === 0) return;
    
    setLoading(true);
    setLogs(['INITIALIZING...']);
    setError(null);
    setHasRun(false);

    try {
      await new Promise(r => setTimeout(r, 300));
      addLog(`FETCHING DATA FOR ${tokens.length} ASSETS...`);
      
      const historyPromises = tokens.map(async (token) => {
        const address = token.address || SOL_MINT;
        const data = await GeckoTerminalService.getOHLCV(address, 'day');
        return { symbol: token.symbol, weight: token.weight, data };
      });

      const histories = await Promise.all(historyPromises);
      const validHistories = histories.filter(h => h.data && h.data.length > 0);

      if (validHistories.length === 0) throw new Error("NO DATA AVAILABLE");
      
      addLog("CALCULATING NAV...");
      
      const minLength = Math.min(...validHistories.map(h => h.data.length));
      const limit = Math.min(minLength, 30); // 過去30日
      
      const slicedHistories = validHistories.map(h => ({
        ...h,
        data: h.data.slice(-limit) 
      }));

      const basePrices = slicedHistories.map(h => h.data[0].close);
      const totalWeight = tokens.reduce((sum, t) => sum + t.weight, 0);
      const rawData: any[] = [];

      let maxPeak = 0;
      let maxDrawdown = 0;

      for (let i = 0; i < limit; i++) {
        const time = slicedHistories[0].data[i].time;
        let portfolioValue = 0;

        slicedHistories.forEach((h, idx) => {
          const currentPrice = h.data[i].close;
          const initialPrice = basePrices[idx];
          const normalizedPrice = (currentPrice / initialPrice) * 100;
          portfolioValue += (normalizedPrice * h.weight) / totalWeight;
        });

        if (portfolioValue > maxPeak) maxPeak = portfolioValue;
        const currentDrawdown = ((maxPeak - portfolioValue) / maxPeak) * 100;
        if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;

        rawData.push({
          time,
          value: portfolioValue,
        });
      }

      // 統計計算
      const startVal = rawData[0].value;
      const endVal = rawData[rawData.length - 1].value;
      const totalReturn = ((endVal - startVal) / startVal) * 100;
      
      let sumVariance = 0;
      for(let i = 1; i < rawData.length; i++) {
          const ret = (rawData[i].value - rawData[i-1].value) / rawData[i-1].value;
          sumVariance += Math.pow(ret, 2);
      }
      const dailyVol = Math.sqrt(sumVariance / (rawData.length - 1));
      const annualizedVol = dailyVol * Math.sqrt(365) * 100;
      const sharpe = annualizedVol !== 0 ? totalReturn / annualizedVol : 0;

      setStats({
        totalReturn,
        volatility: annualizedVol,
        sharpeRatio: sharpe,
        maxDrawdown
      });

      // 少し滑らかにする
      const smoothData = interpolateData(rawData, 5);
      setChartData(smoothData);
      
      addLog("COMPLETE.");
      setHasRun(true);

    } catch (e: any) {
      console.error(e);
      setError("SIMULATION FAILED");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0C0A09] rounded-3xl border border-white/10 overflow-hidden flex flex-col h-full shadow-2xl relative group">
      
      {/* Overlay: Idle */}
      {!hasRun && !loading && (
        <div className="absolute inset-0 bg-[#0C0A09]/90 backdrop-blur-md z-20 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-[#D97706]/10 rounded-full flex items-center justify-center mb-6 border border-[#D97706]/30 shadow-[0_0_30px_rgba(217,119,6,0.2)]">
            <Terminal className="w-10 h-10 text-[#D97706]" />
          </div>
          <h3 className="text-2xl font-black text-white mb-2 font-mono tracking-tighter">
            BACKTEST
          </h3>
          <p className="text-white/40 mb-8 max-w-xs text-sm font-mono">
            Verify protocol performance against historical data.
          </p>
          <button
            onClick={runSimulation}
            disabled={tokens.length === 0}
            className="px-8 py-4 bg-[#D97706] hover:bg-[#B45309] text-black font-black font-mono rounded-xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5 fill-current" />
            RUN SIMULATION
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 relative bg-gradient-to-b from-black to-[#141210]">
        
        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex flex-col justify-center items-center z-10 bg-black/80 p-6">
            <Loader2 className="w-12 h-12 text-[#D97706] animate-spin mb-6" />
            <div className="w-full max-w-md">
                <TerminalLog logs={logs} />
            </div>
          </div>
        )}

        {/* Chart Area */}
        <div className="absolute inset-0 p-4 pb-0 flex flex-col">
           {hasRun && !loading && (
              <div className="mb-4 pl-2 font-mono z-10">
                 <div className="text-[10px] text-white/40 mb-1">TOTAL RETURN</div>
                 <div className={`text-4xl font-black tracking-tighter ${stats.totalReturn >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    {stats.totalReturn > 0 ? '+' : ''}{stats.totalReturn.toFixed(2)}%
                 </div>
              </div>
           )}

           <div className="flex-1 w-full relative opacity-90">
             {hasRun && !loading && (
               <RichChart 
                 data={chartData} 
                 type="area" 
                 height={260}
                 isPositive={stats.totalReturn >= 0}
                 colors={{
                   lineColor: stats.totalReturn >= 0 ? '#10B981' : '#EF4444',
                   areaTopColor: stats.totalReturn >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
                   areaBottomColor: 'rgba(0,0,0,0)'
                 }}
               />
             )}
           </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-3 gap-px bg-white/5 border-t border-white/5">
        <StatBox label="VOLATILITY" value={`${stats.volatility.toFixed(1)}%`} dim={!hasRun} />
        <StatBox label="MAX DRAWDOWN" value={`-${stats.maxDrawdown.toFixed(2)}%`} dim={!hasRun} color="text-red-400" />
        <StatBox label="SHARPE RATIO" value={stats.sharpeRatio.toFixed(2)} dim={!hasRun} color="text-[#D97706]" />
      </div>
    </div>
  );
};

const StatBox = ({ label, value, dim, color = 'text-white' }: { label: string, value: string, dim?: boolean, color?: string }) => (
  <div className={`p-3 text-center bg-[#0C0A09] transition-opacity duration-500 ${dim ? 'opacity-30' : 'opacity-100'}`}>
    <p className="text-[8px] text-white/30 uppercase font-bold tracking-widest mb-1 font-mono">{label}</p>
    <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
  </div>
);