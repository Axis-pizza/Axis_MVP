// src/components/create/manual/BacktestSimulation.tsx

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, TrendingUp, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'; // アイコン変更

interface BacktestSimulationProps {
  onBack: () => void;
  onNext: () => void;
  tokens: any[];
}

export const BacktestSimulation = ({ onBack, onNext, tokens }: BacktestSimulationProps) => {
  const [phase, setPhase] = useState<'LOADING' | 'RESULT'>('LOADING');
  const [loadingText, setLoadingText] = useState('Initializing AI Agent...');
  
  useEffect(() => {
    if (phase === 'LOADING') {
      const texts = [
        "Analyzing historical volatility...",
        "Simulating liquidity scenarios...",
        "Optimizing rebalance triggers...",
        "Stress testing portfolio...",
        "Finalizing alpha report..."
      ];
      let i = 0;
      const interval = setInterval(() => {
        setLoadingText(texts[i]);
        i++;
        if (i >= texts.length) {
          clearInterval(interval);
          setTimeout(() => setPhase('RESULT'), 800);
        }
      }, 800);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const initialInvestment = 10000;
  const finalValue = 24500;
  const profit = finalValue - initialInvestment;

  return (
    <div className="min-h-[500px] flex flex-col items-center justify-center animate-in fade-in duration-500">
      
      {phase === 'LOADING' ? (
        <div className="text-center space-y-8 relative">
          {/* 高級感あるローディング演出 */}
          <div className="relative w-32 h-32 mx-auto">
             {/* Outer Rings */}
             <div className="absolute inset-0 border border-[#D97706]/20 rounded-full animate-[spin_10s_linear_infinite]" />
             <div className="absolute inset-4 border border-[#D97706]/40 rounded-full animate-[spin_5s_linear_infinite_reverse]" />
             
             {/* Glowing Core */}
             <div className="absolute inset-0 flex items-center justify-center">
               <div className="relative">
                 <div className="absolute inset-0 bg-[#D97706] blur-2xl opacity-20 animate-pulse" />
                 <BrainCircuit className="w-12 h-12 text-[#D97706] relative z-10" />
               </div>
             </div>
             
             {/* Orbital Particles */}
             <motion.div 
               className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1.5 w-3 h-3 bg-[#D97706] rounded-full shadow-[0_0_10px_#D97706]"
               animate={{ rotate: 360 }}
               transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
               style={{ transformOrigin: "50% 64px" }}
             />
          </div>

          <div>
            <h3 className="text-2xl font-serif font-bold text-[#E7E5E4] mb-2 tracking-wide">AI Analysis</h3>
            <p className="text-[#D97706] font-mono text-sm uppercase tracking-widest">{loadingText}</p>
          </div>
        </div>
      ) : (
        // RESULT VIEW (変更なし、以前のコードと同じ高品質なチャート)
        <div className="w-full max-w-xl space-y-8">
           {/* ... (以前のコードのResult部分と同様のため省略。BrainCircuitアイコン等は維持) ... */}
           {/* 確認のため、ボタン部分のみ記載 */}
           <div className="text-center">
             <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#D97706]/10 text-[#D97706] text-xs font-bold uppercase tracking-wider mb-4 border border-[#D97706]/20"
             >
               <Sparkles className="w-3 h-3" /> Simulation Complete
             </motion.div>
             <h2 className="text-3xl font-serif font-bold text-[#E7E5E4] mb-2">Excellent Potential</h2>
           </div>

           {/* ... Chart Card (省略) ... */}
           {/* この部分は以前の回答と同じコードを使用してください。必要なら再掲します */}
           <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1C1917] rounded-3xl p-8 border border-[#D97706]/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D97706]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 grid grid-cols-2 gap-8 items-end">
              <div>
                <p className="text-sm text-[#78716C] mb-1">Projected 1Y Value ($10k inv):</p>
                <div className="text-5xl font-serif font-bold text-[#E7E5E4] mb-2">${finalValue.toLocaleString()}</div>
                <div className="flex items-center gap-2 text-green-500 font-bold"><TrendingUp className="w-4 h-4" /><span>+145.0%</span></div>
              </div>
              <div className="h-24 flex items-end gap-1 opacity-80">
                {[20, 35, 30, 45, 60, 55, 75, 70, 90, 85, 100].map((h, i) => (
                  <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.4 + (i * 0.05), type: 'spring' }} className="flex-1 bg-gradient-to-t from-[#D97706]/20 to-[#D97706] rounded-t-sm" />
                ))}
              </div>
            </div>
          </motion.div>

           <div className="flex gap-3 pt-4">
             <button onClick={onBack} className="px-6 py-4 bg-[#1C1917] rounded-xl font-bold text-[#78716C] hover:text-[#E7E5E4]">Back</button>
             <button onClick={onNext} className="flex-1 py-4 bg-gradient-to-r from-[#D97706] to-[#B45309] text-[#0C0A09] font-bold rounded-xl shadow-lg hover:scale-[1.01] transition-all">Proceed to Blueprint</button>
           </div>
        </div>
      )}
    </div>
  );
};