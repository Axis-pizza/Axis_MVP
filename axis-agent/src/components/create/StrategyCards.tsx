import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Shield, Waves, Check, ArrowLeft, TrendingUp, 
  Activity, Lock, Crosshair 
} from 'lucide-react';
import { BacktestChart } from '../common/BacktestChart';
import { TokenImage } from '../common/TokenImage';
import type { Strategy } from '../../types';

interface StrategyCardsProps {
  strategies: Strategy[];
  selectedId: string | null;
  onSelect: (strategy: Strategy) => void;
  onConfirm: () => void;
  onBack: () => void;
}

const TYPE_CONFIG = {
  AGGRESSIVE: {
    icon: Zap,
    label: 'SNIPER', // 攻撃的
    desc: 'High risk, maximum alpha.',
    gradient: 'from-orange-500 to-red-600',
    border: 'border-orange-500/50',
    text: 'text-orange-500',
    bg: 'bg-orange-500/5',
    glow: 'shadow-orange-500/20'
  },
  BALANCED: {
    icon: Waves,
    label: 'WAVE', // バランス
    desc: 'Capture trends, manage risk.',
    gradient: 'from-blue-500 to-indigo-600',
    border: 'border-blue-500/50',
    text: 'text-blue-500',
    bg: 'bg-blue-500/5',
    glow: 'shadow-blue-500/20'
  },
  CONSERVATIVE: {
    icon: Shield,
    label: 'FORTRESS', // 保守的
    desc: 'Preserve capital, steady yield.',
    gradient: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-500/50',
    text: 'text-emerald-500',
    bg: 'bg-emerald-500/5',
    glow: 'shadow-emerald-500/20'
  },
};

const MetricItem = ({ label, value, sub, color }: { label: string, value: string, sub?: string, color?: string }) => (
  <div className="flex flex-col">
    <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider mb-0.5">{label}</span>
    <div className="flex items-baseline gap-1">
      <span className={`text-xl font-black ${color || 'text-white'}`}>{value}</span>
      {sub && <span className="text-[10px] font-bold text-white/50">{sub}</span>}
    </div>
  </div>
);

export const StrategyCards = ({ strategies, selectedId, onSelect, onConfirm, onBack }: StrategyCardsProps) => {
  const selectedStrategy = strategies.find(s => s.id === selectedId);

  return (
    <div className="min-h-screen px-4 py-6 pb-40 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 sticky top-0 z-20 bg-[#030303]/80 backdrop-blur-md py-2">
            <button onClick={onBack} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <div className="text-center">
                <motion.div 
                   initial={{ opacity: 0, y: -10 }} 
                   animate={{ opacity: 1, y: 0 }}
                   className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1"
                >
                    <Crosshair size={12} /> Mission Objective
                </motion.div>
                <h2 className="text-xl font-black text-white">Select Tactic</h2>
            </div>
            <div className="w-11" /> {/* Spacer */}
        </div>

        {/* Cards Grid */}
        <div className="space-y-4 max-w-md mx-auto w-full">
            {strategies.map((strategy, i) => {
                const typeKey = strategy.type as keyof typeof TYPE_CONFIG;
                const conf = TYPE_CONFIG[typeKey] || TYPE_CONFIG.BALANCED;
                const Icon = conf.icon;
                const isSelected = selectedId === strategy.id;

                // 上位4つのトークンを取得（表示用）
                const topTokens = strategy.tokens.slice(0, 4);
                const otherCount = strategy.tokens.length - 4;

                return (
                    <motion.div
                        key={strategy.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => onSelect(strategy)}
                        className={`
                            relative rounded-[32px] overflow-hidden transition-all duration-300 border-2 cursor-pointer group
                            ${isSelected 
                                ? `${conf.border} bg-[#080808] shadow-[0_0_40px_-10px_rgba(0,0,0,0.7)] ${conf.glow} scale-[1.02] z-10` 
                                : 'border-white/5 bg-[#0f0f0f] hover:bg-[#141414] hover:border-white/10 scale-100 opacity-90 hover:opacity-100'
                            }
                        `}
                    >
                        {/* Background Decor */}
                        <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${conf.gradient} opacity-[0.03] blur-3xl pointer-events-none rounded-full translate-x-1/3 -translate-y-1/3`} />

                        <div className="p-6">
                             {/* Top Row: Badge & Name */}
                             <div className="flex justify-between items-start mb-6">
                                 <div>
                                     <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${conf.bg} border ${conf.border} border-opacity-30 mb-3`}>
                                         <Icon size={12} className={conf.text} />
                                         <span className={`text-[10px] font-black tracking-widest uppercase ${conf.text}`}>{conf.label}</span>
                                     </div>
                                     <h3 className="text-2xl font-black text-white leading-none mb-1">{strategy.name}</h3>
                                     <p className="text-xs text-white/40 font-medium">{conf.desc}</p>
                                 </div>
                                 
                                 {/* Selection Checkbox */}
                                 <div className={`
                                     w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                                     ${isSelected ? `bg-white text-black shadow-lg scale-110` : 'bg-white/5 text-white/10 group-hover:bg-white/10'}
                                 `}>
                                     <Check size={16} strokeWidth={4} />
                                 </div>
                             </div>

                             {/* Middle Row: Metrics Grid */}
                             <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                                 <MetricItem 
                                     label="Est. APY" 
                                     value={`+${strategy.metrics?.expectedApy ?? 0}%`} 
                                     color="text-emerald-400"
                                 />
                                 <MetricItem 
                                     label="Risk Lvl" 
                                     value={`${strategy.metrics?.riskScore ?? 0}/10`} 
                                     color={(strategy.metrics?.riskScore ?? 0) > 6 ? "text-orange-400" : "text-emerald-400"}
                                 />
                                 <MetricItem 
                                     label="Sharpe" 
                                     value={`${strategy.metrics?.sharpeRatio?.toFixed(2) ?? '-'}`} 
                                 />
                             </div>

                             {/* Bottom Row: Assets Stack (No Pizza) */}
                             <div className="flex items-center justify-between">
                                 <div className="flex items-center">
                                     <div className="flex -space-x-3">
                                         {topTokens.map((token, idx) => (
                                             <div key={idx} className="relative w-10 h-10 rounded-full border-2 border-[#121212] bg-[#121212] z-10 hover:z-20 hover:scale-110 transition-transform">
                                                 <TokenImage src={token.logoURI} className="w-full h-full rounded-full" />
                                             </div>
                                         ))}
                                         {otherCount > 0 && (
                                             <div className="w-10 h-10 rounded-full border-2 border-[#121212] bg-[#222] flex items-center justify-center z-0">
                                                 <span className="text-[10px] font-bold text-white/50">+{otherCount}</span>
                                             </div>
                                         )}
                                     </div>
                                 </div>
                                 
                                 {/* Toggle Detail Hint */}
                                 <div className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isSelected ? 'text-white/50' : 'text-white/20'}`}>
                                     {isSelected ? 'View Performance' : 'Tap to Select'}
                                 </div>
                             </div>

                             {/* Expanded Details (Backtest) */}
                             <AnimatePresence>
                                 {isSelected && (
                                     <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                     >
                                         <div className="mt-6 pt-6 border-t border-white/5">
                                             <div className="flex items-center justify-between mb-4">
                                                 <div className="text-[10px] text-white/30 uppercase font-bold flex items-center gap-2">
                                                     <Activity size={12} /> Backtest Simulation
                                                 </div>
                                                 <div className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                                                     PROFITABLE
                                                 </div>
                                             </div>
                                             {/* Backtest Chart Component */}
                                             <div className="h-32 w-full bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden relative">
                                                 <BacktestChart data={strategy.backtest || []} height={128} showMetrics={false} />
                                                 {/* Overlay Gradient for Fade */}
                                                 <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]/50 pointer-events-none" />
                                             </div>
                                         </div>
                                     </motion.div>
                                 )}
                             </AnimatePresence>
                        </div>
                    </motion.div>
                );
            })}
        </div>
        
        {/* Floating Action Bar (Fixed Bottom) */}
        <AnimatePresence>
            {selectedStrategy && (
                <motion.div 
                    initial={{ y: 100 }} 
                    animate={{ y: 0 }} 
                    exit={{ y: 100 }}
                    className="fixed bottom-8 left-4 right-4 z-50 max-w-md mx-auto"
                >
                    <button 
                        onClick={onConfirm}
                        className="w-full py-4 bg-white text-black font-black text-lg rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        Customize Strategy <TrendingUp size={20} className="stroke-[3px]" />
                    </button>
                    <p className="text-center text-[10px] text-white/30 mt-3 font-medium">
                        Adjust weights & risk parameters in next step
                    </p>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};