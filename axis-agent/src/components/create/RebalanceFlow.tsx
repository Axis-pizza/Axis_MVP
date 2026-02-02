/**
 * RebalanceFlow - Adjust strategy weights and execute rebalance
 * Allows users to modify token allocations and trigger rebalancing
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, ArrowLeft, TrendingUp, AlertCircle,
  Loader2, CheckCircle2, Sliders,
  Minus, Plus, Info, Zap
} from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { PizzaChart } from '../common/PizzaChart';

interface TokenAllocation {
  symbol: string;
  weight: number;
}

interface RebalanceFlowProps {
  strategyAddress: string;
  strategyName: string;
  strategyType: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  currentTokens: TokenAllocation[];
  onBack: () => void;
  onComplete: () => void;
}

type RebalanceStatus = 'ADJUST' | 'PREVIEW' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

export const RebalanceFlow = ({
  strategyName,
  strategyType,
  currentTokens,
  onBack,
  onComplete,
}: Omit<RebalanceFlowProps, 'strategyAddress'>) => {
  const { publicKey, signTransaction } = useWallet();
  
  const [tokens, setTokens] = useState<TokenAllocation[]>(currentTokens);
  const [status, setStatus] = useState<RebalanceStatus>('ADJUST');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [slippage, setSlippage] = useState<number>(1); // 1% default slippage

  // Calculate total weight to ensure it sums to 100
  const totalWeight = tokens.reduce((sum, t) => sum + t.weight, 0);
  const isValidDistribution = Math.abs(totalWeight - 100) < 0.01;

  // Check if weights have changed
  const hasChanges = tokens.some((t, i) => 
    t.weight !== currentTokens[i]?.weight
  );

  const adjustWeight = (index: number, delta: number) => {
    setTokens(prev => {
      const newTokens = [...prev];
      const newWeight = Math.max(0, Math.min(100, newTokens[index].weight + delta));
      newTokens[index] = { ...newTokens[index], weight: newWeight };
      return newTokens;
    });
  };

  const setWeight = (index: number, weight: number) => {
    setTokens(prev => {
      const newTokens = [...prev];
      newTokens[index] = { ...newTokens[index], weight: Math.max(0, Math.min(100, weight)) };
      return newTokens;
    });
  };

  const handleRebalance = async () => {
    if (!publicKey || !signTransaction) return;

    setStatus('PROCESSING');
    setErrorMessage(null);

    try {
      // Simulate rebalance for demo
      // In production, this would call the tactical_rebalance instruction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStatus('SUCCESS');
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Rebalance failed';
      console.error('Rebalance error:', e);
      setErrorMessage(errorMsg);
      setStatus('ERROR');
    }
  };

  const handlePreview = () => {
    if (isValidDistribution && hasChanges) {
      setStatus('PREVIEW');
    }
  };

  const typeColors = {
    AGGRESSIVE: 'from-orange-500/20 to-red-500/20 border-orange-500/30',
    BALANCED: 'from-blue-500/20 to-purple-500/20 border-blue-500/30',
    CONSERVATIVE: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
  };

  return (
    <div className="min-h-screen px-4 py-6 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold">Rebalance Strategy</h2>
          <p className="text-xs text-white/50">{strategyName}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === 'SUCCESS' ? (
          <RebalanceSuccess 
            tokens={tokens}
            strategyName={strategyName}
            onComplete={onComplete}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-md mx-auto space-y-6"
          >
            {/* Current vs New Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-xs text-white/50 mb-2">Current</p>
                <PizzaChart slices={currentTokens} size={100} showLabels={false} animated={false} />
              </div>
              <div className="text-center">
                <p className="text-xs text-white/50 mb-2">New</p>
                <PizzaChart slices={tokens} size={100} showLabels={false} animated={true} />
              </div>
            </div>

            {/* Weight Adjusters */}
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${typeColors[strategyType]} border`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  Adjust Weights
                </h3>
                <span className={`text-xs px-2 py-1 rounded ${
                  isValidDistribution ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  Total: {totalWeight.toFixed(1)}%
                </span>
              </div>

              <div className="space-y-3">
                {tokens.map((token, index) => (
                  <div key={token.symbol} className="flex items-center gap-3">
                    <span className="w-12 font-mono text-sm">{token.symbol}</span>
                    
                    <button
                      onClick={() => adjustWeight(index, -5)}
                      className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    
                    <div className="flex-1 relative">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-orange-500 to-amber-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${token.weight}%` }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={() => adjustWeight(index, 5)}
                      className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    
                    <input
                      type="number"
                      value={token.weight}
                      onChange={(e) => setWeight(index, parseFloat(e.target.value) || 0)}
                      className="w-14 px-2 py-1 text-right text-sm bg-white/10 border border-white/10 rounded-lg focus:outline-none focus:border-orange-500/50"
                    />
                    <span className="text-xs text-white/50">%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Slippage Setting */}
            <div className="p-3 bg-white/5 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70 flex items-center gap-1">
                  <Info className="w-4 h-4" />
                  Slippage Tolerance
                </span>
                <div className="flex gap-2">
                  {[0.5, 1, 2, 3].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlippage(s)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        slippage === s 
                          ? 'bg-orange-500/30 text-orange-400' 
                          : 'bg-white/10 text-white/50 hover:bg-white/20'
                      }`}
                    >
                      {s}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Validation Warning */}
            {!isValidDistribution && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-sm text-amber-400">
                  Weights must sum to exactly 100%. Current: {totalWeight.toFixed(1)}%
                </p>
              </motion.div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{errorMessage}</p>
              </motion.div>
            )}

            {/* Preview/Execute Button */}
            {status === 'ADJUST' && (
              <button
                onClick={handlePreview}
                disabled={!isValidDistribution || !hasChanges}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-5 h-5" />
                Preview Rebalance
              </button>
            )}

            {status === 'PREVIEW' && (
              <div className="space-y-3">
                <div className="p-4 bg-white/5 rounded-xl">
                  <h4 className="text-sm font-bold mb-2">Rebalance Preview</h4>
                  <div className="space-y-2 text-xs">
                    {tokens.map((token, i) => {
                      const diff = token.weight - (currentTokens[i]?.weight || 0);
                      if (Math.abs(diff) < 0.1) return null;
                      return (
                        <div key={token.symbol} className="flex items-center justify-between">
                          <span>{token.symbol}</span>
                          <span className={diff > 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <button
                  onClick={handleRebalance}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl font-bold text-black flex items-center justify-center gap-2 shadow-lg"
                >
                  <Zap className="w-5 h-5" />
                  Execute Rebalance
                </button>
                
                <button
                  onClick={() => setStatus('ADJUST')}
                  className="w-full py-3 bg-white/10 rounded-xl font-medium text-sm hover:bg-white/20 transition-colors"
                >
                  Back to Adjust
                </button>
              </div>
            )}

            {status === 'PROCESSING' && (
              <button
                disabled
                className="w-full py-4 bg-white/10 rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                Executing Rebalance...
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Success View
const RebalanceSuccess = ({
  tokens,
  strategyName,
  onComplete,
}: {
  tokens: TokenAllocation[];
  strategyName: string;
  onComplete: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center text-center pt-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-blue-500/30"
      >
        <CheckCircle2 className="w-12 h-12 text-white" />
      </motion.div>

      <h1 className="text-3xl font-bold mb-2">Rebalanced! ⚡</h1>
      <p className="text-white/50 mb-8">{strategyName} has been updated</p>

      <div className="mb-8">
        <PizzaChart slices={tokens} size={140} showLabels={true} animated={true} />
      </div>

      <div className="w-full max-w-sm p-4 bg-white/5 rounded-2xl border border-white/10 mb-8">
        <h4 className="text-sm font-bold mb-3">New Allocation</h4>
        <div className="space-y-2">
          {tokens.map((token) => (
            <div key={token.symbol} className="flex justify-between text-sm">
              <span className="font-mono">{token.symbol}</span>
              <span className="text-white/70">{token.weight}%</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onComplete}
        className="w-full max-w-sm py-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl font-bold text-black flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
      >
        <TrendingUp className="w-5 h-5" />
        Back to Dashboard
      </button>
    </motion.div>
  );
};

export default RebalanceFlow;
