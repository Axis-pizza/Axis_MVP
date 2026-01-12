/**
 * Kagemusha Create Flow - Complete 3-step ETF creation
 * Integrates: TacticalTerminal → StrategyCards → PizzaBuilder → DeploymentBlueprint
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { TacticalTerminal, type Topping } from './TacticalTerminal';
import { StrategyCards } from './StrategyCards';
import { PizzaBuilder } from './PizzaBuilder';
import { DeploymentBlueprint } from './DeploymentBlueprint';
import { api } from '../../services/api';

type CreateStep = 'DIRECTIVE' | 'SIMULATION' | 'CUSTOMIZE' | 'DEPLOY';

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

export const KagemushaFlow = () => {
  const [step, setStep] = useState<CreateStep>('DIRECTIVE');
  const [isLoading, setIsLoading] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [customTokens, setCustomTokens] = useState<{ symbol: string; weight: number }[]>([]);
  const [pizzaName, setPizzaName] = useState('');
  const [customToppings, setCustomToppings] = useState<Topping[]>([]);

  // Step 1: Generate strategies from directive
  const handleAnalyze = async (directive: string, tags: string[], _allToppings: Topping[]) => {
    setIsLoading(true);
    setStep('SIMULATION');

    try {
      const response = await api.analyze(directive, tags);
      
      if (response.success && response.strategies) {
        setStrategies(response.strategies);
      } else {
        // Fallback if API fails - but show empty state
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
      setStep('CUSTOMIZE');
    }
  };

  // Step 3: Customize and deploy
  const handleDeploy = (tokens: { symbol: string; weight: number }[], name: string) => {
    setCustomTokens(tokens);
    setPizzaName(name);
    setStep('DEPLOY');
  };

  // Reset flow
  const handleComplete = () => {
    setStep('DIRECTIVE');
    setStrategies([]);
    setSelectedStrategy(null);
    setCustomTokens([]);
    setPizzaName('');
  };

  return (
    <div className="min-h-screen bg-[#030303]">
      {/* Progress indicator */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/5 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-500"
          animate={{
            width:
              step === 'DIRECTIVE' ? '25%' :
              step === 'SIMULATION' ? '50%' :
              step === 'CUSTOMIZE' ? '75%' :
              '100%',
          }}
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
              onBack={() => setStep('CUSTOMIZE')}
              onComplete={handleComplete}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
