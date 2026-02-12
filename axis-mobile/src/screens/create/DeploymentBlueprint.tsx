import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Image, Modal } from 'react-native';
import { colors } from '../../config/theme';
import { useWallet } from '../../context/WalletContext';
import { useToast } from '../../components/common/context/ToastContext';

interface Props {
  config: { name: string; ticker: string; description: string };
  tokens: { symbol: string; address: string; weight: number; logoURI?: string }[];
  onComplete: () => void;
  onBack: () => void;
}

export function DeploymentBlueprint({ config, tokens, onComplete, onBack }: Props) {
  const [depositAmount, setDepositAmount] = useState('1.0');
  const [showModal, setShowModal] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const { connected } = useWallet();
  const { showToast } = useToast();

  const handleDeploy = async () => {
    if (!connected) {
      showToast('Please connect your wallet first', 'error');
      return;
    }

    setDeploying(true);
    try {
      // TODO: Implement actual deployment with wallet signing
      showToast('Deployment not yet implemented on mobile', 'info');
      setTimeout(() => {
        setDeploying(false);
        onComplete();
      }, 1500);
    } catch (e: any) {
      showToast(e.message || 'Deployment failed', 'error');
      setDeploying(false);
    }
  };

  return (
    <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
      {/* Strategy card preview */}
      <View className="mt-4 p-5 rounded-2xl items-center" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight }}>
        <View className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: `${colors.accent}15` }}>
          <Text className="text-2xl font-bold" style={{ color: colors.accent }}>${config.ticker}</Text>
        </View>
        <Text className="text-white text-xl font-bold text-center" style={{ fontFamily: 'serif' }}>
          {config.name}
        </Text>
        {config.description ? (
          <Text className="text-stone-500 text-sm text-center mt-2">{config.description}</Text>
        ) : null}
      </View>

      {/* Composition */}
      <View className="mt-4 p-4 rounded-xl" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight }}>
        <Text className="text-stone-400 text-xs uppercase tracking-wider mb-3">Composition</Text>
        {tokens.map((token, i) => (
          <View key={i} className="flex-row items-center py-2">
            {token.logoURI ? (
              <Image source={{ uri: token.logoURI }} className="w-6 h-6 rounded-full" />
            ) : (
              <View className="w-6 h-6 rounded-full" style={{ backgroundColor: colors.surfaceLight }} />
            )}
            <Text className="text-white text-sm ml-2 flex-1">{token.symbol}</Text>
            <View className="flex-row items-center gap-2">
              <View
                style={{
                  width: token.weight,
                  height: 4,
                  backgroundColor: colors.accent,
                  borderRadius: 2,
                  maxWidth: 100,
                }}
              />
              <Text className="text-stone-400 text-xs w-8 text-right">{token.weight}%</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Initial deposit */}
      <View className="mt-4 p-4 rounded-xl" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight }}>
        <Text className="text-stone-400 text-xs uppercase tracking-wider mb-3">Initial Deposit (SOL)</Text>
        <TextInput
          value={depositAmount}
          onChangeText={setDepositAmount}
          keyboardType="decimal-pad"
          className="text-white text-2xl font-bold text-center py-3"
          style={{ backgroundColor: colors.backgroundDark, borderRadius: 12 }}
        />
      </View>

      {/* Deploy button */}
      <Pressable
        onPress={() => setShowModal(true)}
        className="mt-6 py-4 rounded-xl items-center mb-8"
        style={{ backgroundColor: colors.accent }}
        disabled={deploying}
      >
        <Text className="text-white font-bold text-base">
          {deploying ? 'Deploying...' : 'Deploy Strategy'}
        </Text>
      </Pressable>

      {/* Confirmation modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View className="mx-6 p-6 rounded-2xl w-[90%]" style={{ backgroundColor: colors.surface }}>
            <Text className="text-white text-lg font-bold text-center mb-4">Confirm Deployment</Text>
            <Text className="text-stone-400 text-sm text-center mb-6">
              Deploy ${config.ticker} with {depositAmount} SOL initial deposit?
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: colors.surfaceLight }}
              >
                <Text className="text-stone-400 font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => { setShowModal(false); handleDeploy(); }}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: colors.accent }}
              >
                <Text className="text-white font-bold">Deploy</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
