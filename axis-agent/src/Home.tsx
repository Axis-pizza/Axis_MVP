

import { useTacticalStore } from './store/useTacticalStore';
import { DirectiveView } from './components/DirectiveView';
import { KagemushaMatrix } from './components/KagemushaMatrix';
import { StrategySelector } from './components/StrategySelector';
import { PizzaAssembly } from './components/PizzaAssembly';
import { DeploymentView } from './components/DeploymentView';

export default function Home() {
  const { step, setStep, directive, selectedTags, setTactics, selectTactic } = useTacticalStore();

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
        
        // Transform or use mock data if API fails/is partial
        // Currently axis-api/kagemusha.ts returns { success: true, tactics: [] }
    
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
    <div className="bg-black min-h-screen text-white font-sans selection:bg-orange-500/30">
        {step === 'DIRECTIVE' && <DirectiveView onAnalyze={handleAnalyze} />}
        {step === 'MATRIX' && <KagemushaMatrix onComplete={handleMatrixComplete} />}
        {step === 'SIMULATION' && <StrategySelector onSelect={handleSelectStrategy} />}
        {step === 'ASSEMBLY' && <PizzaAssembly onDeploy={handleDeploy} />}
        {step === 'DEPLOYMENT' && <DeploymentView />}
    </div>
  );
}