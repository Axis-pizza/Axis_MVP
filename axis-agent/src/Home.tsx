
import { motion, AnimatePresence } from 'framer-motion';
import { Pizza, Trophy, User } from 'lucide-react';
import { useTacticalStore } from './store/useTacticalStore';
import { DirectiveView } from './components/DirectiveView';
import { KagemushaMatrix } from './components/KagemushaMatrix';
import { StrategySelector } from './components/StrategySelector';
import { PizzaAssembly } from './components/PizzaAssembly';
import { DeploymentView } from './components/DeploymentView';
import { LeaderboardView } from './components/LeaderboardView';
import { useState } from 'react';

export default function Home() {
  const { step, setStep, directive, selectedTags, setTactics, selectTactic } = useTacticalStore();
  const [currentView, setCurrentView] = useState<'STUDIO' | 'LEADERBOARD'>('STUDIO');

  const handleAnalyze = async () => {
    setStep('MATRIX');
    
    // Simulate API Call (Replace with real fetch)
    const API_URL = 'https://axis-api.yusukekikuta-05.workers.dev/kagemusha/analyze'; // Adjust if needed
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ directive, tags: selectedTags }),
            mode: 'cors'
        });
        
        const data = await response.json();
        
        if (data.success && data.tactics) {
            setTactics(data.tactics);
        } else {
             // FALLBACK MOCK for demo if API is offline
             setTactics([
                  {
                    id: 'sniper-1',
                    name: 'Shadow Sniper',
                    type: 'SNIPER',
                    description: 'High-momentum strategy targeting meme coin breakouts.',
                    tokens: [{symbol: 'SOL', weight: 40}, {symbol: 'WIF', weight: 40}, {symbol: 'USDC', weight: 20}],
                    metrics: { winRate: '68%', expectedRoi: '+124%', riskLevel: 'HIGH', backtest: []}
                  },
                  {
                    id: 'fortress-1',
                    name: 'Iron Fortress',
                    type: 'FORTRESS',
                    description: 'Delta-neutral yield farming on Drift protocol.',
                    tokens: [{symbol: 'SOL', weight: 50}, {symbol: 'USDC', weight: 50}],
                    metrics: { winRate: '92%', expectedRoi: '+18%', riskLevel: 'LOW', backtest: []}
                  },
                  {
                    id: 'wave-1',
                    name: 'Tidal Wave',
                    type: 'WAVE',
                    description: 'Balanced DLMM strategy on Meteora dynamic pools.',
                    tokens: [{symbol: 'JUP', weight: 40}, {symbol: 'SOL', weight: 40}, {symbol: 'RAY', weight: 20}],
                    metrics: { winRate: '75%', expectedRoi: '+45%', riskLevel: 'MED', backtest: []}
                  }
             ]);
        }
    } catch (e) {
        console.error("Analysis failed", e);
         // FALLBACK
         setTactics([
            {
              id: 'sniper-1',
              name: 'Shadow Sniper (Offline)',
              type: 'SNIPER',
              description: 'High-momentum strategy targeting meme coin breakouts.',
              tokens: [{symbol: 'SOL', weight: 40}, {symbol: 'WIF', weight: 40}, {symbol: 'USDC', weight: 20}],
              metrics: { winRate: '68%', expectedRoi: '+124%', riskLevel: 'HIGH', backtest: []}
            },
            {
                id: 'fortress-1',
                name: 'Iron Fortress',
                type: 'FORTRESS',
                description: 'Delta-neutral yield farming on Drift protocol.',
                tokens: [{symbol: 'SOL', weight: 50}, {symbol: 'USDC', weight: 50}],
                metrics: { winRate: '92%', expectedRoi: '+18%', riskLevel: 'LOW', backtest: []}
              },
              {
                id: 'wave-1',
                name: 'Tidal Wave',
                type: 'WAVE',
                description: 'Balanced DLMM strategy on Meteora dynamic pools.',
                tokens: [{symbol: 'JUP', weight: 40}, {symbol: 'SOL', weight: 40}, {symbol: 'RAY', weight: 20}],
                metrics: { winRate: '75%', expectedRoi: '+45%', riskLevel: 'MED', backtest: []}
              }
         ]);
    }
  };

  const handleMatrixComplete = () => {
      setStep('SIMULATION');
  };

  const handleSelectStrategy = (tactic: any) => {
      selectTactic(tactic);
      setStep('ASSEMBLY');
  };

  const handleDeploy = () => {
      setStep('DEPLOYMENT');
  };

  return (
    <div className="bg-black min-h-screen text-white font-sans selection:bg-orange-500/30 relative">
        <AnimatePresence mode="wait">
            {currentView === 'STUDIO' ? (
                <motion.div 
                    key="studio"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="pb-20"
                >
                    {step === 'DIRECTIVE' && <DirectiveView onAnalyze={handleAnalyze} />}
                    {step === 'MATRIX' && <KagemushaMatrix onComplete={handleMatrixComplete} />}
                    {step === 'SIMULATION' && <StrategySelector onSelect={handleSelectStrategy} />}
                    {step === 'ASSEMBLY' && <PizzaAssembly onDeploy={handleDeploy} />}
                    {step === 'DEPLOYMENT' && <DeploymentView />}
                </motion.div>
            ) : (
                <motion.div 
                    key="leaderboard"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="pb-20"
                >
                    <LeaderboardView />
                </motion.div>
            )}
        </AnimatePresence>

        {/* Improved Bottom Navigation */}
        <nav className="fixed bottom-0 w-full bg-[#0a0a0a]/90 backdrop-blur-2xl border-t border-white/10 py-3 pb-6 flex justify-around z-50 safe-area-bottom">
           <button 
                onClick={() => setCurrentView('STUDIO')}
                className={`flex flex-col items-center gap-1.5 transition-colors ${currentView === 'STUDIO' ? 'text-orange-500' : 'text-white/30 hover:text-white'}`}
            >
               <div className={`p-1 rounded-full ${currentView === 'STUDIO' ? 'bg-orange-500/10' : ''}`}>
                   <Pizza className="w-5 h-5" />
               </div>
               <span className="text-[10px] font-bold tracking-wide">Studio</span>
           </button>
           <button 
                onClick={() => setCurrentView('LEADERBOARD')}
                className={`flex flex-col items-center gap-1.5 transition-colors ${currentView === 'LEADERBOARD' ? 'text-orange-500' : 'text-white/30 hover:text-white'}`}
           >
               <div className={`p-1 rounded-full ${currentView === 'LEADERBOARD' ? 'bg-orange-500/10' : ''}`}>
                   <Trophy className="w-5 h-5" />
               </div>
               <span className="text-[10px] font-bold tracking-wide">Rankings</span>
           </button>
           <button className="flex flex-col items-center gap-1.5 text-white/30 hover:text-white transition-colors">
               <div className="p-1">
                    <User className="w-5 h-5" />
               </div>
               <span className="text-[10px] font-bold tracking-wide">Profile</span>
           </button>
       </nav>
    </div>
  );
}