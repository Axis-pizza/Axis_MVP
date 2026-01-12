/**
 * Create ETF Flow - Modern multi-step ETF creation
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, ArrowLeft, Loader2, Rocket, CheckCircle2 } from 'lucide-react';
import { TokenSelector } from './TokenSelector';
import { StrategyPreview } from './StrategyPreview';
import { BacktestChart } from '../common/BacktestChart';
import { api } from '../../services/api';
import type { TokenAllocation, Strategy, CreateStep } from '../../types';

export const CreateETFFlow = () => {
  const [step, setStep] = useState<CreateStep>('SELECT');
  const [directive, setDirective] = useState('');
  const [selectedTokens, setSelectedTokens] = useState<TokenAllocation[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [deployStatus, setDeployStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [etfName, setEtfName] = useState('');

  // Auto-generate name from directive
  useEffect(() => {
    if (directive && !etfName) {
      const words = directive.split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      setEtfName(words.join('') + ' Index');
    }
  }, [directive]);

  const handleAnalyze = async () => {
    if (!directive.trim()) return;
    
    setLoading(true);
    setStep('CUSTOMIZE');
    
    try {
      const res = await api.analyze(directive, []);
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
      await new Promise(r => setTimeout(r, 2000)); // Simulating
      
      const res = await api.deploy('placeholder_tx', {
        name: etfName,
        type: selectedStrategy?.type,
        composition: selectedTokens,
        creator: 'user_pubkey',
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
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
          initial={{ width: '25%' }}
          animate={{ 
            width: step === 'SELECT' ? '25%' : step === 'CUSTOMIZE' ? '50%' : step === 'REVIEW' ? '75%' : '100%' 
          }}
        />
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 pb-32">
        <AnimatePresence mode="wait">
          {/* Step 1: Input & AI Generation */}
          {step === 'SELECT' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Hero */}
              <div className="text-center pt-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/30"
                >
                  <Sparkles className="w-10 h-10 text-emerald-400" />
                </motion.div>
                <h1 className="text-3xl font-bold mb-2">Create Your ETF</h1>
                <p className="text-white/50">Tell us your investment thesis and let AI build your portfolio</p>
              </div>

              {/* Directive Input */}
              <div className="space-y-4">
                <textarea
                  value={directive}
                  onChange={(e) => setDirective(e.target.value)}
                  placeholder="Example: I want exposure to Solana DeFi with some meme upside..."
                  rows={4}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-base resize-none focus:outline-none focus:border-emerald-500/50 placeholder:text-white/30"
                />

                {/* Quick Tags */}
                <div className="flex flex-wrap gap-2">
                  {['DeFi Focus', 'High Risk', 'Yield Farming', 'Blue Chips', 'Meme Season'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setDirective(prev => prev + ' ' + tag)}
                      className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleAnalyze}
                disabled={!directive.trim() || loading}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
                ) : (
                  <>Generate Strategies <Sparkles className="w-5 h-5" /></>
                )}
              </button>
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
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div>
                <h2 className="text-xl font-bold mb-1">Choose Your Strategy</h2>
                <p className="text-sm text-white/50">AI generated {strategies.length} strategies based on your thesis</p>
              </div>

              {/* Strategy Cards */}
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
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
                  className="w-full py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/90 transition-colors"
                >
                  Customize Portfolio <ArrowRight className="w-5 h-5" />
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Step 3: Review & Customize */}
          {step === 'REVIEW' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <button onClick={() => setStep('CUSTOMIZE')} className="flex items-center gap-2 text-white/50 hover:text-white">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              {/* ETF Name */}
              <div>
                <label className="text-sm text-white/50 mb-2 block">ETF Name</label>
                <input
                  type="text"
                  value={etfName}
                  onChange={(e) => setEtfName(e.target.value)}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-xl font-bold focus:outline-none focus:border-emerald-500/50"
                />
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
                disabled={selectedTokens.length === 0 || deployStatus === 'deploying'}
                className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
              >
                {deployStatus === 'deploying' ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Deploying via Jito...</>
                ) : (
                  <><Rocket className="w-5 h-5" /> Deploy on Solana</>
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
                className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/30"
              >
                <CheckCircle2 className="w-12 h-12 text-black" />
              </motion.div>

              <h1 className="text-3xl font-bold mb-2">ETF Created! 🎉</h1>
              <p className="text-white/50 mb-8">Your {etfName} is now live on Solana</p>

              <div className="w-full max-w-sm p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Network</span>
                  <span className="text-emerald-400 font-medium">Solana Mainnet</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Tokens</span>
                  <span>{selectedTokens.length} assets</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">MEV Protection</span>
                  <span className="text-emerald-400">✓ Jito Bundle</span>
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
