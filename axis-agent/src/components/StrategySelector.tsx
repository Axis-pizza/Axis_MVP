
import { useTacticalStore } from '../store/useTacticalStore';
import type { Tactic } from '../store/useTacticalStore';
import { motion } from 'framer-motion';
import { Crosshair, Shield, Hexagon, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const TypeIcon = ({ type }: { type: Tactic['type'] }) => {
    switch (type) {
        case 'SNIPER': return <Crosshair className="w-5 h-5 text-red-500" />;
        case 'FORTRESS': return <Shield className="w-5 h-5 text-blue-500" />;
        case 'WAVE': return <Hexagon className="w-5 h-5 text-purple-500" />;
    }
};

const MiniPie = ({ tactic }: { tactic: Tactic }) => {
    const data = tactic.tokens.map(t => ({ value: t.weight }));
    const COLORS = ['#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899'];
    return (
        <div className="w-16 h-16 opacity-80">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} innerRadius={20} outerRadius={30} dataKey="value" stroke="none">
                        {data.map((_, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}

export const StrategySelector = ({ onSelect }: { onSelect: (t: Tactic) => void }) => {
    const { generatedTactics } = useTacticalStore();

    return (
        <div className="min-h-screen bg-black p-6 flex flex-col items-center">
             <div className="w-full max-w-md space-y-6">
                <header className="text-center mb-8">
                    <h2 className="text-sm font-mono text-white/40 uppercase tracking-widest mb-1">Tactical Analysis Complete</h2>
                    <h1 className="text-2xl font-bold text-white">Select Deployment Vector</h1>
                </header>
                
                <div className="grid gap-4">
                    {generatedTactics.map((tactic, i) => (
                        <motion.div
                            key={tactic.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.15 }}
                            whileHover={{ scale: 1.02, borderColor: 'rgba(249,115,22,0.5)' }}
                            onClick={() => onSelect(tactic)}
                            className="bg-[#111] border border-white/10 rounded-2xl p-5 cursor-pointer hover:bg-[#1a1a1a] transition-colors relative overflow-hidden group"
                        >
                            {/* Card Accent */}
                            <div className={`absolute top-0 left-0 w-1 h-full 
                                ${tactic.type === 'SNIPER' ? 'bg-red-500' : 
                                  tactic.type === 'FORTRESS' ? 'bg-blue-500' : 'bg-purple-500'}
                            `} />
                            
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                                        <TypeIcon type={tactic.type} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight">{tactic.name}</h3>
                                        <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full 
                                            ${tactic.type === 'SNIPER' ? 'bg-red-500/10 text-red-500' : 
                                              tactic.type === 'FORTRESS' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}
                                        `}>
                                            {tactic.type}
                                        </span>
                                    </div>
                                </div>
                                <MiniPie tactic={tactic} />
                            </div>
                            
                            <p className="text-sm text-white/50 mb-5 leading-relaxed">
                                {tactic.description}
                            </p>
                            
                            <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
                                <div>
                                    <span className="text-[10px] text-white/30 uppercase block mb-1">Est. ROI</span>
                                    <span className="text-green-400 font-mono font-bold">{tactic.metrics.expectedRoi}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-white/30 uppercase block mb-1">Win Rate</span>
                                    <span className="text-white font-mono font-bold">{tactic.metrics.winRate}</span>
                                </div>
                                <div className="text-right">
                                     <button className="text-xs text-orange-500 border border-orange-500/30 px-3 py-1.5 rounded hover:bg-orange-500/10 transition-colors inline-flex items-center gap-1">
                                         <BarChart2 className="w-3 h-3" /> Backtest
                                     </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
             </div>
        </div>
    );
};
