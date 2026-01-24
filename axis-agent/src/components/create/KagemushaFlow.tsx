/**
 * Kagemusha Create Flow - Corrected Data Passing
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

import { TacticalTerminal, type Topping } from './TacticalTerminal';
import { StrategyCards } from './StrategyCards';
import { PizzaBuilder } from './PizzaBuilder';
import { DepositFlow } from './DepositFlow';
import { StrategyDashboard } from './StrategyDashboard';
import { RebalanceFlow } from './RebalanceFlow';
import { CreateModeSelector } from './CreateModeSelector';
import { ManualFlow, type ManualData } from './manual/ManualFlow'; // 型をimport
import { StrategySettings } from './manual/StrategySettings';
import { api } from '../../services/api';
import { getUserStrategies, type OnChainStrategy } from '../../services/kagemusha';
import type { Strategy } from '../../types/index';

type CreateStep = 'DIRECTIVE' | 'SIMULATION' | 'CUSTOMIZE' | 'SETTINGS' | 'DEPOSIT' | 'DASHBOARD' | 'REBALANCE';


interface DeployedStrategy {
  address: string;
  name: string;
  type: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  tokens: { symbol: string; weight: number }[];
}

export const KagemushaFlow = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  
  const [step, setStep] = useState<CreateStep>('DIRECTIVE');
  const [createMode, setCreateMode] = useState<'AI' | 'MANUAL'>('MANUAL');

  // AI Flow State
  const [isLoading, setIsLoading] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [customTokens, setCustomTokens] = useState<{ symbol: string; weight: number }[]>([]);
  const [pizzaName, setPizzaName] = useState('');
  const [customToppings, setCustomToppings] = useState<Topping[]>([]);
  
  // Settings & Deposit State
  const [strategySettings, setStrategySettings] = useState<any>({});
  const [initialDepositAmount, setInitialDepositAmount] = useState<number>(0);
  
  // Dashboard State
  const [deployedStrategy, setDeployedStrategy] = useState<DeployedStrategy | null>(null);
  const [userStrategies, setUserStrategies] = useState<OnChainStrategy[]>([]);
  const [selectedDashboardStrategy, setSelectedDashboardStrategy] = useState<OnChainStrategy | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

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
    if (step === 'DASHBOARD' && publicKey) {
      loadUserStrategies();
    }
  }, [step, publicKey, loadUserStrategies]);

  // AI Handlers
  const handleAnalyze = async (directive: string, tags: string[]) => {
    setIsLoading(true);
    setStep('SIMULATION');
    try {
      const response = await api.analyze(directive, tags);
      if (response.success && response.strategies) {
        setStrategies(response.strategies);
      } else {
        setStrategies([]);
      }
    } catch (e) {
      setStrategies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectStrategy = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
  };

  const handleConfirmStrategy = () => {
    if (selectedStrategy) {
      setCustomTokens(selectedStrategy.tokens);
      if (publicKey) {
        const addr = publicKey.toBase58();
        setPizzaName(`${addr.slice(0, 4)}...${addr.slice(-4)} Pizza`);
      } else {
        setPizzaName('My Alpha Pizza');
      }
      setStep('CUSTOMIZE');
    }
  };

  const handleCustomizeConfirm = (tokens: { symbol: string; weight: number }[], name: string) => {
    setCustomTokens(tokens);
    setPizzaName(name);
    setStep('SETTINGS');
  };

  const handleSettingsConfirm = (params: any, info: any) => {
    setStrategySettings(params);
    setPizzaName(info.name);
    // AIの場合、データは既にState(customTokens)にあるのでアドレスのみ渡す
    handleDeploySuccess("So11111111111111111111111111111111111111112");
  };

  // --- Common Handlers ---
  // ★重要: ここでデータを受け取る (manualData引数を追加)
  const handleDeploySuccess = (
    strategyAddress: string, 
    manualData?: ManualData // 型定義を使用
  ) => {
    // データソースの決定: マニュアルデータがあればそれを使用、なければAIのStateを使用
    const finalTokens = manualData?.tokens || customTokens;
    const finalName = manualData?.name || pizzaName;
    const finalType = manualData?.type || selectedStrategy?.type || 'BALANCED';

    // データの整合性チェック（デバッグ用）
    if (!finalTokens || finalTokens.length === 0) {
      console.warn("Warning: Token data is empty in handleDeploySuccess");
    }

    setDeployedStrategy({
      address: strategyAddress,
      name: finalName,
      type: finalType,
      tokens: finalTokens,
    });
    
    setInitialDepositAmount(0);
    setStep('DEPOSIT');
  };

  const handleDepositComplete = () => {
    setStep('DASHBOARD');
  };

  const handleCreateNew = () => {
    resetFlow();
    setStep('DIRECTIVE');
  };

  const resetFlow = () => {
    setStrategies([]);
    setSelectedStrategy(null);
    setCustomTokens([]);
    setPizzaName('');
    setStrategySettings({});
    setDeployedStrategy(null);
    setSelectedDashboardStrategy(null);
    setInitialDepositAmount(0);
    setStep('DIRECTIVE');
  };

  const getProgress = () => {
    if (createMode === 'MANUAL' && step === 'DIRECTIVE') return '0%';
    switch (step) {
      case 'DIRECTIVE': return '20%';
      case 'SIMULATION': return '40%';
      case 'CUSTOMIZE': return '60%';
      case 'SETTINGS': return '80%';
      case 'DEPOSIT': return '90%';
      case 'DASHBOARD': case 'REBALANCE': return '100%';
      default: return '0%';
    }
  };

  return (
    <div className="min-h-screen bg-[#030303]">
      {(createMode === 'AI' || step !== 'DIRECTIVE') && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-white/5 z-50">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500"
            animate={{ width: getProgress() }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      <div className="pt-20 px-4 pb-32 max-w-4xl mx-auto">
        {step === 'DIRECTIVE' && (
          <CreateModeSelector mode={createMode} onChange={setCreateMode} />
        )}

        {step === 'DASHBOARD' || step === 'REBALANCE' || step === 'DEPOSIT' ? (
           <AnimatePresence mode="wait">
             {step === 'DEPOSIT' && deployedStrategy && (
               <motion.div key="deposit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                 <DepositFlow
                   strategyAddress={deployedStrategy.address}
                   strategyName={deployedStrategy.name}
                   strategyType={deployedStrategy.type}
                   tokens={deployedStrategy.tokens}
                   initialAmount={initialDepositAmount}
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
                   onDeposit={(s) => { const os = userStrategies.find(us => us.address === s.id); if(os) { setDeployedStrategy({ address: os.address, name: os.name, type: os.strategyType, tokens: os.tokens }); setStep('DEPOSIT'); } }}
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
        ) : createMode === 'MANUAL' ? (
          
          /* --- Manual Flow --- */
          <ManualFlow 
            // ★重要修正: 子(data)から受け取ったデータを、親の関数に引数として渡す！
            onDeploySuccess={(data) => handleDeploySuccess("So11111111111111111111111111111111111111112", data)} 
          />
        
        ) : (
          
          /* --- AI Flow --- */
          <AnimatePresence mode="wait">
            {step === 'DIRECTIVE' && (
              <motion.div key="directive" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <TacticalTerminal 
                  onAnalyze={handleAnalyze} 
                  isLoading={isLoading}
                  customToppings={customToppings}
                  setCustomToppings={setCustomToppings}
                />
              </motion.div>
            )}
            {step === 'SIMULATION' && (
              <motion.div key="simulation" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                    <p className="text-white/50">Designing strategies...</p>
                  </div>
                ) : (
                  <StrategyCards
                    strategies={strategies}
                    selectedId={selectedStrategy?.id || null}
                    onSelect={handleSelectStrategy}
                    onConfirm={handleConfirmStrategy}
                  />
                )}
              </motion.div>
            )}
            {step === 'CUSTOMIZE' && selectedStrategy && (
              <motion.div key="customize" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <PizzaBuilder
                  initialTokens={selectedStrategy.tokens}
                  onBack={() => setStep('SIMULATION')}
                  onDeploy={handleCustomizeConfirm}
                />
              </motion.div>
            )}
            {step === 'SETTINGS' && (
              <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <StrategySettings
                  onBack={() => setStep('CUSTOMIZE')}
                  onNext={handleSettingsConfirm}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};