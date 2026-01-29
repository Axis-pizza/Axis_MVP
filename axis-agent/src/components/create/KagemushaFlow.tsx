import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet, useConnection } from '../../hooks/useWallet';

// --- Components ---
import { CreateLanding } from './CreateLanding'; // ★ New Landing Page
import { ManualDashboard, type ManualData } from './manual/ManualDashboard';
import { DepositFlow } from './DepositFlow';
import { StrategyDashboard } from './StrategyDashboard';
import { RebalanceFlow } from './RebalanceFlow';

// --- Services ---
import { getUserStrategies, type OnChainStrategy } from '../../services/kagemusha';

// --- Types ---
// 'LANDING' を追加
type CreateStep = 'LANDING' | 'BUILDER' | 'DEPOSIT' | 'DASHBOARD' | 'REBALANCE';

interface FlowToken {
  symbol: string;
  weight: number;
  mint?: string;
  logoURI?: string;
}

interface DeployedStrategy {
  address: string;
  name: string;
  type: string;
  tokens: FlowToken[];
  ticker?: string;
  description?: string;
  config?: any;
}

export const KagemushaFlow = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  
  // ★ Default to LANDING
  const [step, setStep] = useState<CreateStep>('LANDING'); 
  
  // Post-Deployment State
  const [deployedStrategy, setDeployedStrategy] = useState<DeployedStrategy | null>(null);
  const [userStrategies, setUserStrategies] = useState<OnChainStrategy[]>([]);
  const [selectedDashboardStrategy, setSelectedDashboardStrategy] = useState<OnChainStrategy | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  // Effects
  const loadUserStrategies = useCallback(async () => {
    if (!publicKey) return;
    setIsDashboardLoading(true);
    try {
      const strategies = await getUserStrategies(connection, publicKey);
      setUserStrategies(strategies);
    } catch (e) {
      console.error('Failed to load strategies:', e);
    } finally {
      setIsDashboardLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    if (step === 'DASHBOARD' && publicKey) loadUserStrategies();
  }, [step, publicKey, loadUserStrategies]);

  // --- Handlers ---

  // 1. Landing -> Builder
  const handleStartCreate = () => {
    setStep('BUILDER');
  };

  // 2. Builder -> Landing (Back)
  const handleBuilderBack = () => {
    setStep('LANDING');
  };

  // 3. Builder -> Deposit (Success)
  const handleDeploySuccess = (data: ManualData) => {
    setDeployedStrategy({
      address: "So11111111111111111111111111111111111111112",
      name: data.config.name,
      ticker: data.config.ticker,
      description: data.config.description,
      type: 'BALANCED',
      tokens: data.tokens,
      config: data.config
    });
    setStep('DEPOSIT');
  };

  const handleDepositComplete = () => {
    setStep('DASHBOARD');
  };

  const handleCreateNew = () => {
    setStep('LANDING');
  };

  // --- Render ---

  // Post-Deployment Views
  if (['DEPOSIT', 'DASHBOARD', 'REBALANCE'].includes(step)) {
    return (
      <div className="min-h-screen bg-[#030303] pt-20 px-4 pb-32 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
             {step === 'DEPOSIT' && deployedStrategy && (
               <motion.div key="deposit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                 <DepositFlow
                   strategyAddress={deployedStrategy.address}
                   strategyName={deployedStrategy.name}
                   strategyType={deployedStrategy.type}
                   tokens={deployedStrategy.tokens}
                   initialAmount={0}
                   onBack={() => setStep('DASHBOARD')}
                   onComplete={handleDepositComplete}
                 />
               </motion.div>
             )}
             {step === 'DASHBOARD' && (
               <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                 <StrategyDashboard
                   strategies={userStrategies.map(s => ({
                     id: s.address, name: s.name, type: s.strategyType, tokens: s.tokens, tvl: s.tvl, pnl: s.pnl, pnlPercent: s.pnlPercent, isActive: s.isActive, lastRebalance: s.lastRebalance,
                   }))}
                   onSelectStrategy={(s) => { const os = userStrategies.find(us => us.address === s.id); if(os) setSelectedDashboardStrategy(os); }}
                   onDeposit={(s) => { const os = userStrategies.find(us => us.address === s.id); if(os) { setDeployedStrategy({ address: os.address, name: os.name, type: os.strategyType, tokens: os.tokens, ticker: os.ticker }); setStep('DEPOSIT'); } }}
                   onRebalance={(s) => { const os = userStrategies.find(us => us.address === s.id); if(os) { setSelectedDashboardStrategy(os); setStep('REBALANCE'); } }}
                   onCreateNew={handleCreateNew}
                   isLoading={isDashboardLoading}
                 />
               </motion.div>
             )}
             {step === 'REBALANCE' && selectedDashboardStrategy && (
               <motion.div key="rebalance" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                 <RebalanceFlow 
                   strategyName={selectedDashboardStrategy.name}
                   strategyType={selectedDashboardStrategy.strategyType}
                   currentTokens={selectedDashboardStrategy.tokens}
                   onBack={() => setStep('DASHBOARD')}
                   onComplete={() => { loadUserStrategies(); setStep('DASHBOARD'); }}
                 />
               </motion.div>
             )}
        </AnimatePresence>
      </div>
    );
  }

  // Creation Flow
  return (
    <div className="min-h-screen bg-[#030303]">
      <div className="h-full">
          <AnimatePresence mode="wait">
            
            {/* Step 1: Landing */}
            {step === 'LANDING' && (
                <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                    <CreateLanding onCreate={handleStartCreate} />
                </motion.div>
            )}

            {/* Step 2: Builder */}
            {step === 'BUILDER' && (
                <motion.div key="builder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ManualDashboard 
                       onDeploySuccess={handleDeploySuccess}
                       onBack={handleBuilderBack} // 戻るボタンでLandingへ
                    />
                </motion.div>
            )}

          </AnimatePresence>
      </div>
    </div>
  );
};