/**
 * Kagemusha Create Flow - Complete strategy creation and management
 * Steps: DIRECTIVE → SIMULATION → CUSTOMIZE → DEPLOY → DEPOSIT → DASHBOARD
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { TacticalTerminal, type Topping } from './TacticalTerminal';
import { StrategyCards } from './StrategyCards';
import { PizzaBuilder } from './PizzaBuilder';
import { DeploymentBlueprint } from './DeploymentBlueprint';
import { DepositFlow } from './DepositFlow';
import { StrategyDashboard } from './StrategyDashboard';
import { RebalanceFlow } from './RebalanceFlow';
import { api } from '../../services/api';
import { getUserStrategies, type OnChainStrategy } from '../../services/kagemusha';

type CreateStep = 
  | 'DIRECTIVE' 
  | 'SIMULATION' 
  | 'CUSTOMIZE' 
  | 'DEPLOY' 
  | 'DEPOSIT' 
  | 'DASHBOARD'
  | 'REBALANCE';

interface Strategy {
  id: string;
  name: string;
  type: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  description: string;
  tokens: { symbol: string; weight: number }[];
  metrics: {
    expectedApy: number;
    riskScore: number;
    winRate: number;
    sharpeRatio: number;
  };
  backtest: {
    timestamps: number[];
    values: number[];
    sharpeRatio: number;
    maxDrawdown: number;
    volatility: number;
  };
}

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
  const [isLoading, setIsLoading] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [customTokens, setCustomTokens] = useState<{ symbol: string; weight: number }[]>([]);
  const [pizzaName, setPizzaName] = useState('');
  const [pizzaDescription, setPizzaDescription] = useState('');
  const [customToppings, setCustomToppings] = useState<Topping[]>([]);
  
  // Deployed strategy info (after deployment)
  const [deployedStrategy, setDeployedStrategy] = useState<DeployedStrategy | null>(null);
  
  // Dashboard data
  const [userStrategies, setUserStrategies] = useState<OnChainStrategy[]>([]);
  const [selectedDashboardStrategy, setSelectedDashboardStrategy] = useState<OnChainStrategy | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  // Load user strategies when entering dashboard
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

  // Step 1: Generate strategies from directive
  const handleAnalyze = async (directive: string, tags: string[]) => {
    setIsLoading(true);
    setStep('SIMULATION');

    try {
      const response = await api.analyze(directive, tags);
      
      if (response.success && response.strategies) {
        setStrategies(response.strategies);
      } else {
        console.warn('No strategies returned from API');
        setStrategies([]);
      }
    } catch (e) {
      console.error('Analysis error:', e);
      setStrategies([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Select strategy
  const handleSelectStrategy = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
  };

  const handleConfirmStrategy = () => {
    if (selectedStrategy) {
      setCustomTokens(selectedStrategy.tokens);
      if (publicKey) {
        const addr = publicKey.toBase58();
        const shortAddr = `${addr.slice(0, 4)}...${addr.slice(-4)}`;
        setPizzaName(`${shortAddr} Pizza`);
      } else {
        setPizzaName('My Alpha Pizza');
      }
      setStep('CUSTOMIZE');
    }
  };

  // Step 3: Customize and proceed to deploy
  const handleDeploy = (tokens: { symbol: string; weight: number }[], name: string, description?: string) => {
    setCustomTokens(tokens);
    setPizzaName(name);
    setPizzaDescription(description || '');
    setStep('DEPLOY');
  };

  // After successful deployment, go to deposit
  const handleDeploySuccess = (strategyAddress: string) => {
    setDeployedStrategy({
      address: strategyAddress,
      name: pizzaName,
      type: selectedStrategy?.type || 'BALANCED',
      tokens: customTokens,
    });
    setStep('DEPOSIT');
  };

  // After deposit, go to dashboard
  const handleDepositComplete = () => {
    setStep('DASHBOARD');
  };

  // Dashboard actions
  const handleCreateNew = () => {
    resetFlow();
    setStep('DIRECTIVE');
  };

  const handleSelectDashboardStrategy = (strategy: OnChainStrategy) => {
    setSelectedDashboardStrategy(strategy);
  };

  const handleDepositToStrategy = (strategy: OnChainStrategy) => {
    setDeployedStrategy({
      address: strategy.address,
      name: strategy.name,
      type: strategy.strategyType,
      tokens: strategy.tokens,
    });
    setStep('DEPOSIT');
  };

  const handleRebalanceStrategy = (strategy: OnChainStrategy) => {
    setSelectedDashboardStrategy(strategy);
    setStep('REBALANCE');
  };

  // Reset flow
  const resetFlow = () => {
    setStrategies([]);
    setSelectedStrategy(null);
    setCustomTokens([]);
    setPizzaName('');
    setDeployedStrategy(null);
    setSelectedDashboardStrategy(null);
  };

  const handleComplete = () => {
    resetFlow();
    setStep('DIRECTIVE');
  };

  // Calculate progress
  const getProgress = () => {
    switch (step) {
      case 'DIRECTIVE': return '16%';
      case 'SIMULATION': return '33%';
      case 'CUSTOMIZE': return '50%';
      case 'DEPLOY': return '66%';
      case 'DEPOSIT': return '83%';
      case 'DASHBOARD': 
      case 'REBALANCE':
        return '100%';
      default: return '0%';
    }
  };

  return (
    <div className="min-h-screen bg-[#030303]">
      {/* Progress indicator */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/5 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-500"
          animate={{ width: getProgress() }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Directive Input */}
        {step === 'DIRECTIVE' && (
          <motion.div
            key="directive"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <TacticalTerminal 
              onAnalyze={handleAnalyze} 
              isLoading={isLoading}
              customToppings={customToppings}
              setCustomToppings={setCustomToppings}
            />
          </motion.div>
        )}

        {/* Step 2: Strategy Selection */}
        {step === 'SIMULATION' && (
          <motion.div
            key="simulation"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {isLoading ? (
              <div className="min-h-screen flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                <p className="text-white/50">Scanning on-chain data...</p>
                <p className="text-xs text-white/30 mt-1">Generating tactical strategies</p>
              </div>
            ) : strategies.length === 0 ? (
              <div className="min-h-screen flex flex-col items-center justify-center px-4">
                <p className="text-white/50 mb-4">No strategies generated</p>
                <button
                  onClick={() => setStep('DIRECTIVE')}
                  className="px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20"
                >
                  Try Again
                </button>
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

        {/* Step 3: Pizza Customization */}
        {step === 'CUSTOMIZE' && selectedStrategy && (
          <motion.div
            key="customize"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <PizzaBuilder
              initialTokens={selectedStrategy.tokens}
              onBack={() => setStep('SIMULATION')}
              onDeploy={handleDeploy}
            />
          </motion.div>
        )}

        {/* Step 4: Deployment */}
        {step === 'DEPLOY' && selectedStrategy && (
          <motion.div
            key="deploy"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
          >
            <DeploymentBlueprint
              strategyName={pizzaName}
              strategyType={selectedStrategy.type}
              tokens={customTokens}
              description={pizzaDescription}
              onBack={() => setStep('CUSTOMIZE')}
              onComplete={handleComplete}
              onDeploySuccess={handleDeploySuccess}
            />
          </motion.div>
        )}

        {/* Step 5: Deposit */}
        {step === 'DEPOSIT' && deployedStrategy && (
          <motion.div
            key="deposit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DepositFlow
              strategyAddress={deployedStrategy.address}
              strategyName={deployedStrategy.name}
              strategyType={deployedStrategy.type}
              tokens={deployedStrategy.tokens}
              onBack={() => setStep('DASHBOARD')}
              onComplete={handleDepositComplete}
            />
          </motion.div>
        )}

        {/* Step 6: Dashboard */}
        {step === 'DASHBOARD' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <StrategyDashboard
              strategies={userStrategies.map(s => ({
                id: s.address,
                name: s.name,
                type: s.strategyType,
                tokens: s.tokens,
                tvl: s.tvl,
                pnl: s.pnl,
                pnlPercent: s.pnlPercent,
                isActive: s.isActive,
                lastRebalance: s.lastRebalance,
              }))}
              onSelectStrategy={(strategy) => {
                const onChain = userStrategies.find(s => s.address === strategy.id);
                if (onChain) handleSelectDashboardStrategy(onChain);
              }}
              onDeposit={(strategy) => {
                const onChain = userStrategies.find(s => s.address === strategy.id);
                if (onChain) handleDepositToStrategy(onChain);
              }}
              onRebalance={(strategy) => {
                const onChain = userStrategies.find(s => s.address === strategy.id);
                if (onChain) handleRebalanceStrategy(onChain);
              }}
              onCreateNew={handleCreateNew}
              isLoading={isDashboardLoading}
            />
          </motion.div>
        )}

        {/* Step 7: Rebalance */}
        {step === 'REBALANCE' && selectedDashboardStrategy && (
          <motion.div
            key="rebalance"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <RebalanceFlow
              strategyName={selectedDashboardStrategy.name}
              strategyType={selectedDashboardStrategy.strategyType}
              currentTokens={selectedDashboardStrategy.tokens}
              onBack={() => setStep('DASHBOARD')}
              onComplete={() => {
                loadUserStrategies();
                setStep('DASHBOARD');
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
