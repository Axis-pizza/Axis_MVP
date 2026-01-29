import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Rocket, CheckCircle2, Cpu, RefreshCw, Loader2 } from 'lucide-react';

// コンポーネントのインポート
import { TokenSelector } from './TokenSelector'; 
import { BacktestChart } from '../common/BacktestChart';
import { TacticalTerminal } from './TacticalTerminal'; // ★ここ重要

// 型定義など
import type { TokenAllocation } from '../../types';

type FlowStep = 'INPUT' | 'PROCESSING' | 'EDIT' | 'DEPLOY' | 'SUCCESS';

// AI演出用ログ
const AI_LOADING_LOGS = [
  "Initializing quantum node connection...",
  "Scanning Solana spl-token registry...",
  "Filtering honey-pots and rug-pulls...",
  "Analyzing on-chain volume velocity...",
  "Calculating beta coefficients vs SOL...",
  "Optimizing Sharpe ratio...",
  "Allocating weights based on market cap...",
  "Finalizing portfolio composition..."
];

// 戦略ごとの設定（色やラベルなど）
const STRATEGY_META: Record<string, { label: string, color: string }> = {
  bluechip: { label: 'Blue Chips', color: '#3B82F6' },
  meme: { label: 'Meme Index', color: '#EC4899' },
  defi: { label: 'DeFi 2.0', color: '#8B5CF6' },
  infra: { label: 'L1 / Infra', color: '#10B981' },
  gaming: { label: 'GameFi', color: '#F59E0B' },
  aggr: { label: 'Aggressive', color: '#EF4444' },
};

export const CreateETFFlow = () => {
  const [step, setStep] = useState<FlowStep>('INPUT');
  const [loadingLog, setLoadingLog] = useState<string[]>([]);
  
  // ETF State
  const [etfName, setEtfName] = useState('');
  const [selectedTokens, setSelectedTokens] = useState<TokenAllocation[]>([]);
  const [investmentAmount, setInvestmentAmount] = useState<number>(1.0);
  const [themeColor, setThemeColor] = useState('#10B981');
  const [aiPrompt, setAiPrompt] = useState('');

  // ----------------------------------------------------------------
  // 1. マニュアル（プリセットボタン）が押された時の処理
  // ----------------------------------------------------------------
  const handlePresetSelect = async (strategyId: string) => {
    // IDに基づいてメタデータを取得（なければデフォルト）
    const meta = STRATEGY_META[strategyId] || { label: 'Custom Strategy', color: '#10B981' };

    setThemeColor(meta.color);
    setEtfName(`${meta.label} ETF`);
    
    // モックデータ：実際はAPIや定数から取得するトークンリスト
    const mockTokens: TokenAllocation[] = [
      { symbol: 'SOL', address: 'So1...', percentage: 40, logoURI: '' },
      { symbol: 'JUP', address: 'Jup...', percentage: 30, logoURI: '' },
      { symbol: 'BONK', address: 'Bon...', percentage: 30, logoURI: '' },
    ];
    
    setSelectedTokens(mockTokens);
    setStep('EDIT');
  };

  // ----------------------------------------------------------------
  // 2. AIチャットが送信された時の処理
  // ----------------------------------------------------------------
  const handleAISubmit = async (promptText: string) => {
    if (!promptText.trim()) return;
    
    setAiPrompt(promptText);
    setStep('PROCESSING');
    setThemeColor('#A855F7'); // AIカラー
    setLoadingLog([]);

    // 演出：ハッカー風ログ表示
    for (let i = 0; i < AI_LOADING_LOGS.length; i++) {
      await new Promise(r => setTimeout(r, 400 + Math.random() * 400));
      setLoadingLog(prev => [...prev, AI_LOADING_LOGS[i]]);
    }

    try {
      // ここにAIのAPI処理が入る (今回はモック)
      const aiGeneratedTokens: TokenAllocation[] = [
        { symbol: 'WIF', address: '...', percentage: 40, logoURI: '' },
        { symbol: 'POPCAT', address: '...', percentage: 30, logoURI: '' },
        { symbol: 'MYRO', address: '...', percentage: 30, logoURI: '' },
      ];
      
      const suggestedName = promptText.split(' ').slice(0, 2).join(' ').toUpperCase() + " INDEX";
      
      setEtfName(suggestedName);
      setSelectedTokens(aiGeneratedTokens);
      setStep('EDIT');
      
    } catch (err) {
      console.error(err);
      setStep('INPUT');
    }
  };

  const handleDeploy = async () => {
    setStep('DEPLOY');
    // Deploy logic simulation
    await new Promise(r => setTimeout(r, 2000));
    setStep('SUCCESS');
  };

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20">
      
      {/* Background Ambience */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          background: `radial-gradient(circle at 50% 10%, ${themeColor} 0%, transparent 40%)`
        }}
      />

      <div className="max-w-2xl mx-auto px-4 py-12 relative z-10">
        
        <AnimatePresence mode="wait">
          
          {/* =========================================================
              STEP 1: INPUT (Tactical Terminal)
             ========================================================= */}
          {step === 'INPUT' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              >
                <TacticalTerminal 
                  // ↓↓↓ この行が絶対に必要です！ ↓↓↓
                  onSelectPreset={handlePresetSelect} 
                  // ↑↑↑ これがないとエラーになります ↑↑↑

                  onAnalyze={handleAISubmit}
                  isLoading={false}
                />
              </motion.div>
            )}

          {/* =========================================================
              STEP 2: PROCESSING (AI "Work" Animation)
             ========================================================= */}
          {step === 'PROCESSING' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[50vh] space-y-8"
            >
              <div className="relative w-32 h-32">
                <motion.div 
                  className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                 <motion.div 
                  className="absolute inset-2 border-4 border-t-transparent border-r-blue-500 border-b-transparent border-l-transparent rounded-full"
                  animate={{ rotate: -180 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Cpu className="w-8 h-8 text-white/50" />
                </div>
              </div>

              <div className="w-full max-w-md bg-black/40 border border-white/10 rounded-lg p-4 font-mono text-xs h-40 overflow-hidden flex flex-col justify-end">
                {loadingLog.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-green-400/80 mb-1"
                  >
                    <span className="opacity-50 mr-2">{`>`}</span>
                    {log}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* =========================================================
              STEP 3: EDIT (Unified Editor)
             ========================================================= */}
          {step === 'EDIT' && (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setStep('INPUT')}
                  className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Reset
                </button>
                <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-green-400">
                  AI OPTIMIZED
                </div>
              </div>

              <div className="space-y-1">
                <input
                  value={etfName}
                  onChange={(e) => setEtfName(e.target.value)}
                  className="text-3xl font-bold bg-transparent border-none focus:ring-0 p-0 w-full placeholder-white/20"
                />
                <p className="text-white/40 text-sm">Review composition and deploy.</p>
              </div>

              {/* Backtest Preview Chart */}
              <div className="h-40 w-full bg-white/5 rounded-xl border border-white/10 overflow-hidden relative">
                <BacktestChart data={[]} height={160} showMetrics={false} />
              </div>

              {/* Token List Editor */}
              <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-1">
                 <div className="p-3 border-b border-white/10 flex justify-between items-center">
                    <h3 className="font-semibold text-sm">Portfolio Composition</h3>
                    <button className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Rebalance
                    </button>
                 </div>
                 <TokenSelector 
                    selectedTokens={selectedTokens}
                    onUpdate={setSelectedTokens}
                 />
              </div>

              <div className="bg-white/5 rounded-2xl border border-white/10 p-4 flex items-center justify-between">
                 <div>
                    <label className="text-xs text-white/50 block mb-1">Initial Deposit</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={investmentAmount}
                        onChange={(e) => setInvestmentAmount(parseFloat(e.target.value))}
                        className="bg-transparent text-xl font-bold w-24 focus:outline-none"
                      />
                      <span className="font-bold text-sm text-white/50">SOL</span>
                    </div>
                 </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDeploy}
                className="w-full py-4 rounded-xl font-bold text-black flex items-center justify-center gap-2"
                style={{ backgroundColor: themeColor, boxShadow: `0 0 20px ${themeColor}40` }}
              >
                {step === 'DEPLOY' ? (
                  <><Loader2 className="w-5 h-5 animate-spin"/> Deploying...</>
                ) : (
                  <><Rocket className="w-5 h-5" /> Deploy ETF On-Chain</>
                )}
              </motion.button>
            </motion.div>
          )}

          {/* =========================================================
              STEP 4: SUCCESS
             ========================================================= */}
          {step === 'SUCCESS' && (
            <motion.div
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg"
                style={{ backgroundColor: themeColor }}
              >
                <CheckCircle2 className="w-10 h-10 text-black" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{etfName} Deployed!</h2>
              <p className="text-white/50 mb-8 max-w-xs mx-auto">
                Your index is now live on Solana.
              </p>
              <button 
                onClick={() => setStep('INPUT')}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                Return to Dashboard
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};