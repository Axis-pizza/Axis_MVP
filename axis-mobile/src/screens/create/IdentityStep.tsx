import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shuffle } from 'lucide-react-native';
import { colors } from '../../config/theme';

interface StrategyConfig {
  name: string;
  ticker: string;
  description: string;
}

interface Props {
  tokens: { symbol: string; address: string; weight: number; logoURI?: string }[];
  onComplete: (config: StrategyConfig) => void;
  onBack: () => void;
}

function generateRandomTicker(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function IdentityStep({ tokens, onComplete, onBack }: Props) {
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [description, setDescription] = useState('');

  const isValid = name.trim().length > 0 && ticker.trim().length >= 2;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Ticker */}
        <View className="mb-5 mt-4">
          <Text className="text-xs uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>Ticker Symbol</Text>
          <View className="flex-row items-center gap-2">
            <View
              className="flex-1 flex-row items-center px-4 py-3 rounded-xl"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            >
              <Text className="mr-1" style={{ color: colors.textMuted }}>$</Text>
              <TextInput
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="TICKER"
                placeholderTextColor={colors.textMuted}
                className="uppercase flex-1 text-lg font-bold"
                style={{ color: colors.text }}
                autoCapitalize="characters"
                maxLength={5}
              />
            </View>
            <Pressable
              onPress={() => setTicker(generateRandomTicker())}
              className="p-3 rounded-xl"
              style={{ backgroundColor: colors.surface }}
            >
              <Shuffle size={20} color={colors.accent} />
            </Pressable>
          </View>
        </View>

        {/* Name */}
        <View className="mb-5">
          <Text className="text-xs uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>Strategy Name</Text>
          <TextInput
            value={name}
            onChangeText={(v) => setName(v.slice(0, 30))}
            placeholder="e.g. DeFi Blue Chips"
            placeholderTextColor={colors.textMuted}
            className="px-4 py-3 rounded-xl text-base"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, color: colors.text }}
            maxLength={30}
          />
          <Text className="text-xs mt-1 text-right" style={{ color: colors.textMuted }}>{name.length}/30</Text>
        </View>

        {/* Description */}
        <View className="mb-5">
          <Text className="text-xs uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your strategy..."
            placeholderTextColor={colors.textMuted}
            className="px-4 py-3 rounded-xl text-sm"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              minHeight: 100,
              textAlignVertical: 'top',
              color: colors.text,
            }}
            multiline
          />
        </View>

        {/* Summary */}
        <View className="p-4 rounded-xl mb-6" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Text className="text-xs uppercase tracking-wider mb-3" style={{ color: colors.textSecondary }}>Summary</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-sm" style={{ color: colors.textMuted }}>Assets</Text>
            <Text className="text-sm font-medium" style={{ color: colors.text }}>{tokens.length}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm" style={{ color: colors.textMuted }}>Fee</Text>
            <Text className="text-sm font-medium" style={{ color: colors.text }}>1.0%</Text>
          </View>
        </View>

        {/* Deploy button */}
        <Pressable
          onPress={() => isValid && onComplete({ name: name.trim(), ticker: ticker.trim(), description: description.trim() })}
          className="rounded-xl overflow-hidden mb-8"
          style={{ opacity: isValid ? 1 : 0.5 }}
          disabled={!isValid}
        >
          <LinearGradient
            colors={isValid ? ['#6B4420', '#B8863F', '#E8C890'] : [colors.surfaceLight, colors.surfaceLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ paddingVertical: 16, borderRadius: 12, alignItems: 'center' }}
          >
            <Text className="font-bold text-base" style={{ color: isValid ? '#000' : colors.textMuted }}>Continue to Deploy</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
