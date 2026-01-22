import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { StrategyTypeSelector } from './StrategyTypeSelector';
import { TokenConfigurator } from './TokenConfigurator';
import { StrategySettings } from './StrategySettings';
import { BacktestSimulation } from './BacktestSimulation';

type ManualStep = 'TYPE' | 'TOKENS' | 'PARAMS' | 'BACKTEST';

// 親に渡すデータの型定義をexportして共有
export interface ManualData {
  tokens: { symbol: string; weight: number }[];
  name: string;
  description: string;
  type: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
}

interface ManualFlowProps {
  onDeploySuccess: (data: ManualData) => void;
}

export const ManualFlow = ({ onDeploySuccess }: ManualFlowProps) => {
  const [step, setStep] = useState<ManualStep>('TYPE');
  
  const [strategyType, setStrategyType] = useState<'FIXED_WEIGHT' | 'MARKET_CAP'>('FIXED_WEIGHT');
  const [tokens, setTokens] = useState<any[]>([]);
  // 設定情報は今回は単純化のため省略していますが、必要ならsettingsも渡せます
  const [info, setInfo] = useState({ name: '', symbol: '' });

  // ★重要: 全ステップのデータを集約して親に渡す関数
  const handleComplete = () => {
    const manualData: ManualData = {
      // 数値型に安全に変換して渡す
      tokens: tokens.map(t => ({ symbol: t.symbol, weight: Number(t.weight) })),
      name: info.name || "Custom Strategy",
      description: `${info.name} (${info.symbol})`,
      type: strategyType === 'FIXED_WEIGHT' ? 'BALANCED' : 'AGGRESSIVE'
    };
    
    // ここでデータを親(KagemushaFlow)に射出！
    onDeploySuccess(manualData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex gap-2 mb-8">
        {['TYPE', 'TOKENS', 'PARAMS', 'BACKTEST'].map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
            ['TYPE', 'TOKENS', 'PARAMS', 'BACKTEST'].indexOf(step) >= i ? 'bg-[#D97706]' : 'bg-white/10'
          }`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 'TYPE' && (
          <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <StrategyTypeSelector onSelect={(type) => { setStrategyType(type); setStep('TOKENS'); }} />
          </motion.div>
        )}

        {step === 'TOKENS' && (
          <motion.div key="tokens" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <TokenConfigurator onBack={() => setStep('TYPE')} onNext={(t) => { setTokens(t); setStep('PARAMS'); }} />
          </motion.div>
        )}

        {step === 'PARAMS' && (
          <motion.div key="params" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <StrategySettings 
              onBack={() => setStep('TOKENS')} 
              onNext={(params, newInfo) => { 
                setInfo(newInfo); 
                setStep('BACKTEST');
              }} 
            />
          </motion.div>
        )}

        {step === 'BACKTEST' && (
          <motion.div key="backtest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <BacktestSimulation 
               tokens={tokens}
               onBack={() => setStep('PARAMS')}
               // ★修正: 完了ボタンを押したらhandleCompleteを実行
               onNext={handleComplete} 
             />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};