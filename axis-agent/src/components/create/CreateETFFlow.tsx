/**
 * Create ETF Flow - Modern multi-step ETF creation
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Loader2, Rocket, CheckCircle2 } from 'lucide-react';
import { TokenSelector } from './TokenSelector';
import { StrategyPreview } from './StrategyPreview';
import { BacktestChart } from '../common/BacktestChart';
import { api } from '../../services/api';
import type { TokenAllocation, Strategy, CreateStep } from '../../types';
import { TacticalTerminal, TOPPINGS, type Topping } from './TacticalTerminal';

export const CreateETFFlow = () => {
  const [step, setStep] = useState<CreateStep>('SELECT');
  const [directive, setDirective] = useState('');
  const [selectedTokens, setSelectedTokens] = useState<TokenAllocation[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [deployStatus, setDeployStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [etfName, setEtfName] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState<number>(1.0);
  const [themeColor, setThemeColor] = useState('#10B981'); // Default Emerald
  
  // Persist custom toppings across steps
  const [customToppings, setCustomToppings] = useState<Topping[]>([]);
  const [selectedCustomTokens, setSelectedCustomTokens] = useState<Topping[]>([]);

  // Auto-generate name from directive
  useEffect(() => {
    if (directive && !etfName) {
      const words = directive.split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      setEtfName(words.join('') + ' Index');
    }
  }, [directive]);

  const handleAnalyze = async (dir: string, tags: string[], allToppings: Topping[]) => {
    setDirective(dir);
    setLoading(true);
    setStep('CUSTOMIZE');

    // Set theme color based on first tag
    if (tags.length > 0) {
      const primaryTopping = TOPPINGS.find(t => t.id === tags[0]);
      if (primaryTopping) setThemeColor(primaryTopping.color);
    }

    // Store selected custom tokens (those not in default TOPPINGS)
    const customSelected = tags
      .map(id => allToppings.find(t => t.id === id))
      .filter((t): t is Topping => 
        t !== undefined && !TOPPINGS.some(defaultT => defaultT.id === t.id)
      );
    setSelectedCustomTokens(customSelected);
    
    try {
      const res = await api.analyze(dir, tags);
      if (res.success && res.strategies) {
        setStrategies(res.strategies);
        // Auto-select first strategy
        if (res.strategies.length > 0) {
          setSelectedStrategy(res.strategies[0]);
          setSelectedTokens(res.strategies[0].tokens);
        }
      }
    } catch (e) {
      console.error('Analysis failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStrategy = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setSelectedTokens(strategy.tokens);
  };

  const handleDeploy = async () => {
    setDeployStatus('deploying');
    
    try {
      // In real implementation, this would:
      // 1. Create transaction with wallet adapter
      // 2. Send via Jito bundle
      // 3. Include swap instructions for investmentAmount
      await new Promise(r => setTimeout(r, 2000)); // Simulating
      
      const res = await api.deploy('placeholder_tx', {
        name: etfName,
        type: selectedStrategy?.type,
        composition: selectedTokens,
        creator: 'user_pubkey',
        initialInvestment: investmentAmount
      });

      if (res.success) {
        setDeployStatus('success');
        setStep('DEPLOY');
      } else {
        setDeployStatus('error');
      }
    } catch (e) {
      console.error('Deploy failed:', e);
      setDeployStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/5 z-50">
        <motion.div
          className="h-full"
          style={{ backgroundColor: themeColor }}
          initial={{ width: '25%' }}
          animate={{ 
            width: step === 'SELECT' ? '25%' : step === 'CUSTOMIZE' ? '50%' : step === 'REVIEW' ? '75%' : '100%' 
          }}
        />
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 pb-32">
        <AnimatePresence mode="wait">
          {/* Step 1: Tactical Terminal (Input) */}
          {step === 'SELECT' && (
            <motion.div
              key="select"
              exit={{ opacity: 0, y: -20 }}
            >
              <TacticalTerminal 
                onAnalyze={handleAnalyze} 
                isLoading={loading}
                customToppings={customToppings}
                setCustomToppings={setCustomToppings}
              />
            </motion.div>
          )}

          {/* Step 2: Strategy Selection & Customization */}
          {step === 'CUSTOMIZE' && (
            <motion.div
              key="customize"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <button onClick={() => setStep('SELECT')} className="flex items-center gap-2 text-white/50 hover:text-white">
                <ArrowLeft className="w-4 h-4" /> Back to Kitchen
              </button>

              <div>
                <h2 className="text-xl font-bold mb-1">Choose Your Strategy</h2>
                <p className="text-sm text-white/50">AI generated {strategies.length} strategies based on your thesis</p>
              </div>

              {/* Display Selected Custom Tokens */}
              {selectedCustomTokens.length > 0 && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-xs text-white/50 mb-3">Your Selected Tokens</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomTokens.map(topping => (
                      <div 
                        key={topping.id}
                        className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg border border-white/20"
                      >
                        {topping.image ? (
                          <img src={topping.image} alt={topping.label} className="w-5 h-5 rounded-full" />
                        ) : (
                          <topping.Icon className="w-5 h-5 text-white/70" />
                        )}
                        <span className="text-sm font-medium">{topping.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strategy Cards */}
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: themeColor }} />
                </div>
              ) : (
                <div className="space-y-4">
                  {strategies.map((strategy) => (
                    <StrategyPreview
                      key={strategy.id}
                      strategy={strategy}
                      selected={selectedStrategy?.id === strategy.id}
                      onSelect={handleSelectStrategy}
                      expanded={selectedStrategy?.id === strategy.id}
                      themeColor={themeColor}
                    />
                  ))}
                </div>
              )}

              {/* Continue Button */}
              {selectedStrategy && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setStep('REVIEW')}
                  className="w-full py-4 text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-colors"
                  style={{ backgroundColor: themeColor }}
                >
                  Customize Portfolio <ArrowRight className="w-5 h-5" />
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Step 3: Review & Fund */}
          {step === 'REVIEW' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <button onClick={() => setStep('CUSTOMIZE')} className="flex items-center gap-2 text-white/50 hover:text-white">
                <ArrowLeft className="w-4 h-4" /> Back to Strategies
              </button>

              {/* ETF Name */}
              <div>
                <label className="text-sm text-white/50 mb-2 block">ETF Name</label>
                <input
                  type="text"
                  value={etfName}
                  onChange={(e) => setEtfName(e.target.value)}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-xl font-bold focus:outline-none"
                  style={{ borderColor: `${themeColor}40` }}
                />
              </div>

              {/* Investment Amount */}
              <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white/70">Initial Investment</label>
                  <span className="text-xs text-white/40">Balance: 12.5 SOL</span>
                </div>
                
                <div className="relative">
                  <input
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(parseFloat(e.target.value) || 0)}
                    min="0.1"
                    step="0.1"
                    className="w-full p-4 pr-16 bg-black/20 border border-white/10 rounded-xl text-2xl font-bold focus:outline-none focus:border-opacity-50 transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                    <span className="font-bold text-sm">SOL</span>
                    <div className="w-5 h-5 rounded-full bg-[#9945FF]" />
                  </div>
                </div>

                <div className="text-xs text-white/40 flex justify-between px-1">
                  <span>≈ ${(investmentAmount * 145).toFixed(2)} USD</span>
                  <span>Min: 0.1 SOL</span>
                </div>
              </div>

              {/* Backtest Preview */}
              {selectedStrategy?.backtest && (
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <BacktestChart data={selectedStrategy.backtest} height={160} showMetrics={true} />
                </div>
              )}

              {/* Token Customization */}
              <TokenSelector
                selectedTokens={selectedTokens}
                onUpdate={setSelectedTokens}
              />

              {/* Deploy Button */}
              <button
                onClick={handleDeploy}
                disabled={selectedTokens.length === 0 || deployStatus === 'deploying' || investmentAmount <= 0}
                className="w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg transition-all text-black"
                style={{ backgroundColor: themeColor, boxShadow: `0 10px 30px -10px ${themeColor}40` }}
              >
                {deployStatus === 'deploying' ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Fund & Deploying...</>
                ) : (
                  <><Rocket className="w-5 h-5" /> Fund & Deploy {investmentAmount} SOL</>
                )}
              </button>
            </motion.div>
          )}

          {/* Step 4: Success */}
          {step === 'DEPLOY' && deployStatus === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-lg"
                style={{ backgroundColor: themeColor, boxShadow: `0 0 40px ${themeColor}60` }}
              >
                <CheckCircle2 className="w-12 h-12 text-black" />
              </motion.div>

              <h1 className="text-3xl font-bold mb-2">ETF Deployed & Funded! 🎉</h1>
              <p className="text-white/50 mb-8">Your {etfName} is live with {investmentAmount} SOL liquidity</p>

              <div className="w-full max-w-sm p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Initial Value</span>
                  <span className="font-medium" style={{ color: themeColor }}>{investmentAmount} SOL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Tokens</span>
                  <span>{selectedTokens.length} assets</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">MEV Protection</span>
                  <span style={{ color: themeColor }}>✓ Jito Bundle</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setStep('SELECT');
                  setDirective('');
                  setSelectedTokens([]);
                  setSelectedStrategy(null);
                  setDeployStatus('idle');
                  setEtfName('');
                  setInvestmentAmount(1.0);
                }}
                className="mt-8 px-6 py-3 bg-white/10 rounded-xl font-medium hover:bg-white/20 transition-colors"
              >
                Create Another ETF
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
