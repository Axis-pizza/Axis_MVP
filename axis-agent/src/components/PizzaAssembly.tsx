
import { useTacticalStore } from '../store/useTacticalStore';
import type { Token } from '../store/useTacticalStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Pizza, ChevronUp, ChevronDown, RotateCcw, Rocket } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';

// Color palette for tokens
const COLORS = ['#9945FF', '#84cc16', '#3b82f6', '#f97316', '#ef4444', '#eab308', '#8b5cf6'];

export const PizzaAssembly = ({ onDeploy }: { onDeploy: () => void }) => {
    const { pizzaComposition, updatePizza } = useTacticalStore();
    const [tokens, setTokens] = useState<Token[]>(pizzaComposition);

    // Sync store
    useEffect(() => {
        setTokens(pizzaComposition);
    }, [pizzaComposition]);

    const handleWeightChange = (symbol: string, delta: number) => {
        const newTokens = tokens.map(t => {
            if (t.symbol === symbol) {
                return { ...t, weight: Math.max(0, t.weight + delta) };
            }
            return t;
        });
        // Renormalize happens only on save or continuously? Let's do continuously for UX but visually it might be jumpy.
        // For "Subway" feel, let's just adjust the number and show a warning if != 100% or auto-balance others.
        // Let's implement simple clamping for now.
        setTokens(newTokens);
        updatePizza(newTokens);
    };

    const totalWeight = tokens.reduce((acc, t) => acc + t.weight, 0);

    return (
        <div className="flex flex-col h-screen bg-[#121212] font-sans relative overflow-hidden">
             
             {/* Header */}
             <div className="pt-6 pb-2 px-6 flex justify-between items-center z-20 bg-gradient-to-b from-[#121212] to-transparent">
                 <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Assembly Line</h1>
                    <p className="text-white/40 text-xs uppercase tracking-widest">Customize & Deploy</p>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                     <Pizza className="w-5 h-5 text-orange-500" />
                 </div>
             </div>

             {/* Pizza Visual (The "End Product") */}
             <div className="relative h-64 shrink-0 -mt-4 z-10 flex items-center justify-center">
                  <div className="w-56 h-56 relative animate-spin-slow">
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie 
                                data={tokens as any[]} 
                                dataKey="weight" 
                                innerRadius={60} 
                                outerRadius={80} 
                                stroke="none" 
                                paddingAngle={5}
                                cornerRadius={5}
                            >
                                {tokens.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                         </PieChart>
                      </ResponsiveContainer>
                      {/* Center Info */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className={`text-3xl font-bold ${totalWeight > 100 ? 'text-red-500' : 'text-white'}`}>
                                {totalWeight}%
                            </span>
                            <span className="text-[10px] text-white/30 uppercase">Allocation</span>
                      </div>
                  </div>
             </div>

             {/* The Conveyor Belt (Ingredients) */}
             <div className="flex-1 overflow-y-auto px-4 pb-32 space-y-3 z-20">
                 <div className="flex items-center gap-2 mb-2 px-2">
                     <div className="h-4 w-1 bg-orange-500 rounded-full" />
                     <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Active Ingredients</span>
                 </div>
                 
                 <AnimatePresence>
                    {tokens.map((token, index) => (
                        <motion.div
                            key={token.symbol}
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            transition={{ delay: index * 0.05 }}
                            className={`
                                relative flex items-center justify-between p-4 rounded-xl bg-[#1a1a1a] border border-white/5 shadow-sm
                            `}
                        >
                            <div className="flex items-center gap-4">
                                <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-inner"
                                    style={{ backgroundColor: COLORS[index % COLORS.length], color: '#000' }}
                                >
                                    {token.symbol[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{token.symbol}</h3>
                                    <p className="text-xs text-white/40">{token.weight}% Weight</p>
                                </div>
                            </div>
                            
                            {/* Controls */}
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleWeightChange(token.symbol, -5)}
                                    className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                                >
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                                <motion.div 
                                    key={token.weight}
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    className="w-8 text-center font-mono font-bold"
                                >
                                    {token.weight}
                                </motion.div>
                                <button 
                                    onClick={() => handleWeightChange(token.symbol, 5)}
                                    className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                                >
                                    <ChevronUp className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                 </AnimatePresence>
                 
                 <button className="w-full py-4 rounded-xl border border-dashed border-white/10 text-white/30 hover:border-white/30 hover:text-white transition-all text-sm font-medium uppercase tracking-widest flex items-center justify-center gap-2">
                     + Add Ingredient
                 </button>
             </div>

             {/* Bottom Deployment Actions */}
             <div className="fixed bottom-0 w-full bg-[#121212]/90 backdrop-blur-xl border-t border-white/10 p-6 z-50 safe-area-bottom">
                 <div className="flex gap-4">
                     <button className="flex-1 py-4 rounded-xl bg-[#222] text-white font-bold hover:bg-[#2a2a2a] transition-all flex items-center justify-center gap-2">
                         <RotateCcw className="w-4 h-4" />
                         Reset
                     </button>
                     <button 
                        onClick={onDeploy}
                        className="flex-[2] py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] transition-all flex items-center justify-center gap-2"
                     >
                         <Rocket className="w-4 h-4" />
                         DEPLOY VAULT
                     </button>
                 </div>
             </div>
        </div>
    );
};
