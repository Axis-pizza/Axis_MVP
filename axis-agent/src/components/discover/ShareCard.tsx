/**
 * ShareCard.tsx
 * Hidden component used for generating shareable images
 * Fixed for html2canvas compatibility (Replaced Tailwind opacity modifiers with explicit Hex/RGBA)
 */
import { forwardRef } from 'react';
import { PizzaChart } from '../common/PizzaChart';

interface ChartPoint { 
  timestamp: number; 
  value: number; 
}

interface ShareCardProps {
  strategy: {
    name: string;
    ticker: string;
    price: number;
    apy: number;
    tvl: string | number;
    tokens: any[];
    chartData: ChartPoint[];
  } | null;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(({ strategy }, ref) => {
  if (!strategy) return null;

  const data = strategy.chartData || [];
  const min = Math.min(...data.map(d => d.value));
  const max = Math.max(...data.map(d => d.value));
  const range = max - min || 1;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 600; 
    const y = 200 - ((d.value - min) / range) * 160 - 20; 
    return `${x},${y}`;
  }).join(' ');

  const isPositive = (data[data.length - 1]?.value ?? 0) >= (data[0]?.value ?? 0);
  const color = isPositive ? '#D97706' : '#EF4444'; 

  // Colors with explicit opacity for html2canvas compatibility
  // #D97706 is RGB(217, 119, 6)
  const bgGold5 = 'rgba(217, 119, 6, 0.05)';   // /5
  const bgGold20 = 'rgba(217, 119, 6, 0.2)';  // /20
  const bgGold30 = 'rgba(217, 119, 6, 0.3)';  // /30
  const borderGold20 = 'rgba(217, 119, 6, 0.2)';
  const borderGold30 = 'rgba(217, 119, 6, 0.3)';
  const textGray = '#78716C'; 

  return (
    <div 
      ref={ref}
      style={{ 
        position: 'absolute', 
        top: '-9999px', 
        left: '-9999px',
        width: '1200px', 
        height: '630px',
        background: 'linear-gradient(135deg, #0C0A09 0%, #1C1917 100%)',
        fontFamily: '"Times New Roman", Times, serif', // Explicit font
      }}
      className="flex relative overflow-hidden text-[#E7E5E4]"
    >
      {/* Background Decor */}
      <div 
        className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-[120px]" 
        style={{ 
          background: bgGold5, 
          transform: 'translate(33%, -33%)' 
        }} 
      />
      <div 
        className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[100px]" 
        style={{ 
          background: bgGold5, 
          transform: 'translate(-33%, 33%)' 
        }} 
      />

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-20" 
           style={{ backgroundImage: 'radial-gradient(#D97706 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />

      <div className="relative z-10 w-full h-full p-16 flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <div 
              className="w-20 h-20 rounded-full bg-[#D97706] flex items-center justify-center text-3xl font-bold text-black shadow-2xl"
              style={{ border: `4px solid ${borderGold30}` }}
            >
              {strategy.ticker[0]}
            </div>
            <div>
              <h1 className="text-5xl font-bold mb-2 tracking-tight" style={{ fontFamily: 'serif' }}>{strategy.name}</h1>
              <div className="flex items-center gap-3">
                <span 
                  className="text-[#D97706] px-4 py-1 rounded-full text-xl font-bold"
                  style={{ background: bgGold20, border: `1px solid ${borderGold30}` }}
                >
                  {strategy.ticker}
                </span>
                <span className="text-2xl font-mono" style={{ color: textGray }}>Axis Protocol ETF</span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
             <h2 className="text-4xl font-bold text-[#D97706] tracking-widest" style={{ fontFamily: 'serif' }}>AXIS</h2>
             <p className="text-sm tracking-[0.3em] uppercase mt-1" style={{ color: textGray }}>AI Strategy Factory</p>
          </div>
        </div>

        {/* Middle: Chart & Pizza */}
        <div className="flex items-center gap-16 flex-1 py-8">
          {/* Chart */}
          <div className="flex-1 h-64 relative">
             <div className="absolute top-0 left-0">
               <p className="text-6xl font-bold tabular-nums" style={{ fontFamily: 'serif' }}>${strategy.price.toFixed(2)}</p>
               <p className="text-3xl font-bold mt-2" style={{ color: color }}>
                 {isPositive ? '+' : ''}{((strategy.price - (data[0]?.value || 1)) / (data[0]?.value || 1) * 100).toFixed(2)}%
               </p>
             </div>
             
             <div className="absolute bottom-0 left-0 right-0 h-48">
               <svg viewBox="0 0 600 200" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                 <defs>
                   <linearGradient id="shareChartGradient" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                     <stop offset="100%" stopColor={color} stopOpacity="0" />
                   </linearGradient>
                 </defs>
                 <path d={`M 0,200 ${points} 600,200 Z`} fill="url(#shareChartGradient)" />
                 <polyline points={points} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
               </svg>
             </div>
          </div>

          {/* Pizza Visual */}
          <div className="w-64 h-64 relative scale-125 mr-8">
             <PizzaChart slices={strategy.tokens} size={250} showLabels={false} animated={false} />
             {/* Overlay Text */}
             <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className="rounded-xl p-3 text-center"
                  style={{ 
                    background: 'rgba(0,0,0,0.6)', 
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${borderGold30}`
                  }}
                >
                   <p className="text-xs uppercase tracking-widest" style={{ color: textGray }}>Yield</p>
                   <p className="text-[#D97706] text-3xl font-bold">{strategy.apy}%</p>
                </div>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between pt-6" style={{ borderTop: `1px solid ${borderGold20}` }}>
           <div className="flex gap-12">
              <div>
                <p className="text-sm uppercase tracking-widest mb-1" style={{ color: textGray }}>TVL</p>
                <p className="text-2xl font-bold">${strategy.tvl}</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-widest mb-1" style={{ color: textGray }}>Composition</p>
                <div className="flex gap-2">
                   {strategy.tokens.slice(0, 4).map((t: any) => (
                      <span 
                        key={t.symbol} 
                        className="px-3 py-1 rounded text-sm text-[#D97706]"
                        style={{ background: '#1C1917', border: `1px solid ${borderGold20}` }}
                      >
                        {t.symbol} {t.weight}%
                      </span>
                   ))}
                </div>
              </div>
           </div>
           
           <div className="text-right">
              <div className="bg-white p-2 rounded-lg inline-block mb-2">
                 <div className="w-16 h-16 bg-black opacity-10" /> 
              </div>
              <p className="text-xs" style={{ color: textGray }}>Scan to Invest</p>
           </div>
        </div>
      </div>
    </div>
  );
});

ShareCard.displayName = 'ShareCard';