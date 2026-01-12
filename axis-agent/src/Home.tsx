
import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Sparkles, Pizza, RefreshCw, CircleDollarSign } from 'lucide-react';

const INITIAL_DATA = [
  { name: 'SOL', value: 45, color: '#9945FF' },
  { name: 'JUP', value: 30, color: '#84cc16' },
  { name: 'USDC', value: 20, color: '#3b82f6' },
  { name: 'Bonk', value: 5, color: '#f97316' },
];

export default function Home() {
  const [data, setData] = useState(INITIAL_DATA);
  const [activeSlice, setActiveSlice] = useState<number | null>(null);

  const handleRebalance = () => {
    // Mock rebalance logic with animation via state update
    const newData = data.map(item => ({
      ...item,
      value: Math.max(5, Math.floor(Math.random() * 80))
    }));
    // Normalize to 100
    const total = newData.reduce((sum, item) => sum + item.value, 0);
    const normalized = newData.map(item => ({
        ...item,
        value: Math.round((item.value / total) * 100)
    }));
    setData(normalized);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-black relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 z-10 border-b border-white/5 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-500/20 rounded-xl">
                <Pizza className="w-5 h-5 text-orange-500" />
            </div>
            <span className="font-bold text-lg tracking-tight">Kagemusha</span>
        </div>
        <WalletMultiButton className="!bg-white/5 !border !border-white/10 !rounded-full !h-9 !px-4 !text-sm !font-medium hover:!bg-white/10 transition-colors" />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center w-full max-w-2xl mx-auto px-6 py-8 z-10 pb-28">
        
        {/* Title */}
        <div className="text-center mb-10 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-semibold uppercase tracking-wider mb-4">
                Strategy Factory
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white via-white/90 to-white/50 mb-3 tracking-tight">
                Pizza Strategy
            </h1>
            <p className="text-white/50 text-base max-w-md mx-auto">
                Select your ingredients and bake your custom Solana ETF portfolio managed by AI.
            </p>
        </div>

        {/* Pizza Visualization */}
        <div className="relative w-72 h-72 md:w-80 md:h-80 mb-12 animate-fade-in">
            {/* Glow */}
            <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full opacity-50" />
            
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        innerRadius="60%"
                        outerRadius="100%"
                        paddingAngle={4}
                        cornerRadius={6}
                        dataKey="value"
                        stroke="none"
                        onClick={(_, index) => setActiveSlice(index)}
                    >
                        {data.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color} 
                                className="transition-all duration-300 hover:opacity-80 cursor-pointer outline-none"
                                strokeWidth={activeSlice === index ? 4 : 0}
                                stroke="rgba(255,255,255,0.2)"
                            />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px' }}
                        itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}
                        formatter={(value?: number) => [`${value}%`]}
                    />
                </PieChart>
            </ResponsiveContainer>
            
            {/* Center Stat */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold tracking-tighter">{data.reduce((acc, i) => acc + i.value, 0)}%</span>
                <span className="text-xs text-white/40 uppercase tracking-widest font-medium">Allocation</span>
            </div>
        </div>

        {/* Ingredients / Allocations List */}
        <div className="w-full space-y-3 mb-10">
            <div className="flex items-center justify-between text-xs font-semibold text-white/30 uppercase tracking-wider px-2">
                <span>Ingredients</span>
                <span>Weight</span>
            </div>
            {data.map((item, index) => (
                <div 
                    key={item.name}
                    className={`flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm transition-all cursor-pointer ${activeSlice === index ? 'border-orange-500/50 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.1)]' : 'hover:bg-white/10'}`}
                    onClick={() => setActiveSlice(index)}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/5">
                             {/* Placeholder icons based on name - simplifying */}
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}` }} />
                        </div>
                        <div>
                             <span className="font-bold block">{item.name}</span>
                             <span className="text-xs text-white/40">{item.value * 10} USD est.</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="font-mono text-lg font-medium block">{item.value}%</span>
                    </div>
                </div>
            ))}
            
            {/* Add ingredient placeholder */}
            <button className="w-full py-3 rounded-xl border border-dashed border-white/20 text-white/40 hover:text-white/80 hover:border-white/40 transition-all flex items-center justify-center gap-2 text-sm font-medium">
                <CircleDollarSign className="w-4 h-4" />
                Add Ingredient
            </button>
        </div>

        {/* Actions */}
        <div className="w-full grid grid-cols-2 gap-4 sticky bottom-24">
             <button 
                onClick={handleRebalance}
                className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 transition-all font-semibold text-sm group"
            >
                <RefreshCw className="w-4 h-4 text-white/60 group-hover:rotate-180 transition-transform duration-500" />
                Randomize
            </button>
            <button className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-black font-extrabold transition-all shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:shadow-[0_0_40px_rgba(249,115,22,0.5)] transform hover:-translate-y-1">
                <Sparkles className="w-5 h-5" />
                BAKE PIZZA
            </button>
        </div>

      </main>

        {/* Bottom Nav */}
         <nav className="fixed bottom-0 w-full bg-[#0a0a0a]/90 backdrop-blur-2xl border-t border-white/10 py-3 pb-6 flex justify-around z-50">
           <button className="flex flex-col items-center gap-1.5 text-orange-500">
               <div className="p-1 rounded-full bg-orange-500/10">
                   <Pizza className="w-5 h-5" />
               </div>
               <span className="text-[10px] font-bold tracking-wide">Studio</span>
           </button>
           <button className="flex flex-col items-center gap-1.5 text-white/30 hover:text-white transition-colors">
               <div className="p-1">
                   <div className="w-5 h-5 rounded-md border-2 border-current" />
               </div>
               <span className="text-[10px] font-bold tracking-wide">Vaults</span>
           </button>
           <button className="flex flex-col items-center gap-1.5 text-white/30 hover:text-white transition-colors">
               <div className="p-1">
                    <div className="w-5 h-5 rounded-full border-2 border-current" />
               </div>
               <span className="text-[10px] font-bold tracking-wide">Profile</span>
           </button>
       </nav>

    </div>
  );
}