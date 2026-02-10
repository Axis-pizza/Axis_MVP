import { useState, useEffect, useCallback } from 'react';
// AnimatePresence removed: nested animations in ManualDashboard/IdentityStep
// caused exit animation to block the BLUEPRINT step from rendering
import { useWallet, useConnection } from '../../hooks/useWallet';
import React from 'react';
// --- Components ---
import { CreateLanding } from './CreateLanding';
import { ManualDashboard, type ManualData } from './manual/ManualDashboard';
import { DeploymentBlueprint } from './DeploymentBlueprint'; // ★ DepositFlowの代わりにこれを使用
import { StrategyDashboard } from './StrategyDashboard';
import { RebalanceFlow } from './RebalanceFlow';

// --- Services ---
import { getUserStrategies, type OnChainStrategy } from '../../services/kagemusha';


class SimpleErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-500 bg-black min-h-screen">
          <h1 className="text-2xl font-bold mb-4">⚠️ Something went wrong</h1>
          <pre className="bg-red-900/20 p-4 rounded border border-red-500/50 whitespace-pre-wrap">
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ★ Step定義を更新
type CreateStep = 'LANDING' | 'BUILDER' | 'BLUEPRINT' | 'DASHBOARD' | 'REBALANCE';

interface KagemushaFlowProps {
  onStepChange?: (step: CreateStep) => void;
}

export const KagemushaFlow = ({ onStepChange }: KagemushaFlowProps) => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  
  const [step, setStep] = useState<CreateStep>('LANDING');

  // ★ Builderで作ったデータを一時保存するState
  const [draftStrategy, setDraftStrategy] = useState<ManualData | null>(null);

  // Dashboard用のState (既存維持)
  const [userStrategies, setUserStrategies] = useState<OnChainStrategy[]>([]);
  const [selectedDashboardStrategy, setSelectedDashboardStrategy] = useState<OnChainStrategy | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

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

  const handleStartCreate = () => {
    setStep('BUILDER');
  };

  const handleBuilderBack = () => {
    setStep('LANDING');
    setDraftStrategy(null);
  };

  // ★ Builder(Identity)完了時の処理
  const handleBuilderComplete = (data: ManualData) => {
    // データ構造のチェック
    if (!data) {
      console.error("❌ [Flow] Data is null/undefined");
      return;
    }
    if (!data.config) {
      console.error("❌ [Flow] data.config is missing", data);
      return;
    }
    if (!data.tokens || data.tokens.length === 0) {
      console.error("❌ [Flow] data.tokens is missing or empty", data);
      return;
    }

    setDraftStrategy(data);
    setStep('BLUEPRINT');
  };

  const handleBlueprintBack = () => {
    setStep('BUILDER');
  };

  // ★ Mint完了時の処理
  const handleDeploymentComplete = () => {
    setDraftStrategy(null);
    // まずDAGHBOARDに遷移（同一コンポーネント内でアンマウントを防ぐ）
    setStep('DASHBOARD');
  };

  const handleCreateNew = () => {
    setStep('LANDING');
  };

  return (
    <SimpleErrorBoundary>
    <div className="min-h-screen bg-[#030303] w-full relative overflow-hidden">
        {/* 1. LANDING */}
        {step === 'LANDING' && (
            <CreateLanding onCreate={handleStartCreate} />
        )}

        {/* 2. BUILDER (ManualDashboard + Identity) */}
        {step === 'BUILDER' && (
            <ManualDashboard
               onDeploySuccess={handleBuilderComplete}
               onBack={handleBuilderBack}
               initialConfig={draftStrategy?.config}
               initialTokens={draftStrategy?.tokens}
            />
        )}

        {/* 3. BLUEPRINT */}
        {step === 'BLUEPRINT' && (
            <div className="pt-20 px-4 pb-32 max-w-6xl mx-auto">
                {draftStrategy && draftStrategy.config ? (
                    <DeploymentBlueprint
                        strategyName={draftStrategy.config.name || 'Untitled'}
                        strategyType="BALANCED"
                        tokens={draftStrategy.tokens || []}
                        description={draftStrategy.config.description || ''}
                        info={{ symbol: draftStrategy.config.ticker || 'ETF' }}
                        initialTvl={1.0}
                        onBack={handleBlueprintBack}
                        onComplete={handleDeploymentComplete}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-red-500 gap-4">
                        <h2 className="text-2xl font-bold">Data Loading Error</h2>
                        <p>Strategy data is invalid or missing.</p>
                        <pre className="bg-black/50 p-4 rounded text-xs text-left">
                            {JSON.stringify(draftStrategy, null, 2)}
                        </pre>
                        <button
                            onClick={handleBlueprintBack}
                            className="px-6 py-2 bg-white/10 rounded-lg text-white"
                        >
                            Back to Builder
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* 4. DASHBOARD */}
        {step === 'DASHBOARD' && (
           <div className="pt-20 px-4 pb-32 max-w-6xl mx-auto">
             <StrategyDashboard
               strategies={userStrategies.map(s => ({
                 id: s.address,
                 name: s.name,
                 type: s.strategyType,
                 tokens: s.tokens || [],
                 tvl: s.tvl,
                 pnl: s.pnl || 0,
                 pnlPercent: s.pnlPercent || 0,
                 isActive: s.isActive,
                 lastRebalance: s.lastRebalance ? new Date(s.lastRebalance * 1000) : null,
               }))}
               onSelectStrategy={(s) => {
                   const os = userStrategies.find(us => us.address === s.id);
                   if(os) setSelectedDashboardStrategy(os);
               }}
               onDeposit={(_s) => {
               }}
               onRebalance={(s) => {
                 const os = userStrategies.find(us => us.address === s.id);
                 if(os) {
                   setSelectedDashboardStrategy(os);
                   setStep('REBALANCE');
                 }
               }}
               onCreateNew={handleCreateNew}
               isLoading={isDashboardLoading}
             />
           </div>
        )}

        {/* 5. REBALANCE (Optional) */}
        {step === 'REBALANCE' && selectedDashboardStrategy && (
           <div className="pt-20 px-4 pb-32 max-w-6xl mx-auto">
             <RebalanceFlow
               strategyName={selectedDashboardStrategy.name}
               strategyType={selectedDashboardStrategy.strategyType}
               currentTokens={selectedDashboardStrategy.tokens || []}
               onBack={() => setStep('DASHBOARD')}
               onComplete={() => { loadUserStrategies(); setStep('DASHBOARD'); }}
             />
           </div>
        )}
    </div>
    </SimpleErrorBoundary>
  );
};