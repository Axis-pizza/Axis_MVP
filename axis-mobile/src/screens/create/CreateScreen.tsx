import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '../../config/theme';
import { CreateLanding } from './CreateLanding';
import { ManualBuilder } from './ManualBuilder';
import { IdentityStep } from './IdentityStep';
import { DeploymentBlueprint } from './DeploymentBlueprint';
import { StrategyDashboard } from './StrategyDashboard';
import { DriftVaultBuilder } from './DriftVaultBuilder';

type Step = 'LANDING' | 'BUILDER' | 'IDENTITY' | 'BLUEPRINT' | 'DASHBOARD' | 'VAULT';

interface StrategyConfig {
  name: string;
  ticker: string;
  description: string;
}

interface TokenAlloc {
  symbol: string;
  address: string;
  weight: number;
  logoURI?: string;
}

export function CreateScreen() {
  const [step, setStep] = useState<Step>('LANDING');
  const [config, setConfig] = useState<StrategyConfig>({ name: '', ticker: '', description: '' });
  const [tokens, setTokens] = useState<TokenAlloc[]>([]);
  const insets = useSafeAreaInsets();

  const handleBuilderComplete = (selectedTokens: TokenAlloc[]) => {
    setTokens(selectedTokens);
    setStep('IDENTITY');
  };

  const handleIdentityComplete = (cfg: StrategyConfig) => {
    setConfig(cfg);
    setStep('BLUEPRINT');
  };

  const handleDeployComplete = () => {
    setStep('DASHBOARD');
  };

  const canGoBack = step !== 'LANDING' && step !== 'DASHBOARD' && step !== 'VAULT';

  const goBack = () => {
    switch (step) {
      case 'BUILDER': setStep('LANDING'); break;
      case 'IDENTITY': setStep('BUILDER'); break;
      case 'BLUEPRINT': setStep('IDENTITY'); break;
      default: break;
    }
  };

  // Vault builder handles its own full-screen layout
  if (step === 'VAULT') {
    return <DriftVaultBuilder onBack={() => setStep('LANDING')} />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Header */}
      {canGoBack && (
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={goBack} className="p-1 mr-3">
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>
          <Text className="text-lg font-bold" style={{ color: '#F2E0C8' }}>
            {step === 'BUILDER' ? 'Select Tokens' : step === 'IDENTITY' ? 'Strategy Info' : 'Review & Deploy'}
          </Text>
        </View>
      )}

      {/* Content */}
      {step === 'LANDING' && (
        <CreateLanding
          onCreate={() => setStep('BUILDER')}
          onCreateVault={() => setStep('VAULT')}
        />
      )}
      {step === 'BUILDER' && (
        <ManualBuilder onComplete={handleBuilderComplete} />
      )}
      {step === 'IDENTITY' && (
        <IdentityStep
          tokens={tokens}
          onComplete={handleIdentityComplete}
          onBack={() => setStep('BUILDER')}
        />
      )}
      {step === 'BLUEPRINT' && (
        <DeploymentBlueprint
          config={config}
          tokens={tokens}
          onComplete={handleDeployComplete}
          onBack={() => setStep('IDENTITY')}
        />
      )}
      {step === 'DASHBOARD' && (
        <StrategyDashboard onCreateNew={() => setStep('LANDING')} />
      )}
    </View>
  );
}
