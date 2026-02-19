import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Image, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, serifFont } from '../../config/theme';
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
      const finalTicker = config.ticker.toUpperCase();
      
      console.log(`Deploying strategy with TICKER: ${finalTicker}`);

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
      <View className="mt-4 p-5 rounded-2xl items-center" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
        <View className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: `${colors.accent}15` }}>
          <Text className="text-2xl font-bold" style={{ color: colors.accent }}>
            ${config.ticker.toUpperCase()}
          </Text>
        </View>
        <Text className="text-xl font-bold text-center" style={{ color: colors.text, fontFamily: serifFont }}>
          {config.name}
        </Text>
        {config.description ? (
          <Text className="text-sm text-center mt-2" style={{ color: colors.textMuted }}>{config.description}</Text>
        ) : null}
      </View>

      {/* Composition */}
      <View className="mt-4 p-4 rounded-xl" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
        <Text className="text-xs uppercase tracking-wider mb-3" style={{ color: colors.textSecondary }}>Composition</Text>
        {tokens.map((token, i) => (
          <View key={i} className="flex-row items-center py-2">
            {token.logoURI ? (
              <Image source={{ uri: token.logoURI }} className="w-6 h-6 rounded-full" />
            ) : (
              <View className="w-6 h-6 rounded-full" style={{ backgroundColor: colors.surfaceLight }} />
            )}
            <Text className="text-sm ml-2 flex-1" style={{ color: colors.text }}>{token.symbol}</Text>
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
              <Text className="text-xs w-8 text-right" style={{ color: colors.textSecondary }}>{token.weight}%</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Initial deposit */}
      <View className="mt-4 p-4 rounded-xl" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
        <Text className="text-xs uppercase tracking-wider mb-3" style={{ color: colors.textSecondary }}>Initial Deposit (SOL)</Text>
        <TextInput
          value={depositAmount}
          onChangeText={setDepositAmount}
          keyboardType="decimal-pad"
          className="text-2xl font-bold text-center py-3"
          style={{ backgroundColor: colors.background, borderRadius: 12, color: colors.text }}
        />
      </View>

      {/* Deploy button */}
      <Pressable
        onPress={() => setShowModal(true)}
        className="mt-6 rounded-xl overflow-hidden mb-8"
        disabled={deploying}
      >
        <LinearGradient
          colors={['#6B4420', '#B8863F', '#E8C890']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ paddingVertical: 16, borderRadius: 12, alignItems: 'center' }}
        >
          <Text className="font-bold text-base" style={{ color: '#000' }}>
            {deploying ? 'Deploying...' : 'Deploy Strategy'}
          </Text>
        </LinearGradient>
      </Pressable>

      {/* Confirmation modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View className="mx-6 p-6 rounded-2xl w-[90%]" style={{ backgroundColor: colors.surface }}>
            <Text className="text-lg font-bold text-center mb-4" style={{ color: colors.text }}>Confirm Deployment</Text>
            <Text className="text-sm text-center mb-6" style={{ color: colors.textSecondary }}>
              Deploy ${config.ticker.toUpperCase()} with {depositAmount} SOL initial deposit?
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: colors.surfaceLight }}
              >
                <Text className="font-medium" style={{ color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => { setShowModal(false); handleDeploy(); }}
                className="flex-1 py-3 rounded-xl items-center overflow-hidden"
              >
                <LinearGradient
                  colors={['#6B4420', '#B8863F', '#E8C890']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                <Text className="font-bold" style={{ color: '#000' }}>Deploy</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}