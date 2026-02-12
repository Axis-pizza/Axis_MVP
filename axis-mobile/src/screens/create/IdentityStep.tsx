import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
          <Text className="text-stone-400 text-xs uppercase tracking-wider mb-2">Ticker Symbol</Text>
          <View className="flex-row items-center gap-2">
            <View
              className="flex-1 flex-row items-center px-4 py-3 rounded-xl"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight }}
            >
              <Text className="text-stone-500 mr-1">$</Text>
              <TextInput
                value={ticker}
                onChangeText={(v) => setTicker(v.toUpperCase().slice(0, 5))}
                placeholder="TICKER"
                placeholderTextColor={colors.textDim}
                className="flex-1 text-white text-lg font-bold"
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
          <Text className="text-stone-400 text-xs uppercase tracking-wider mb-2">Strategy Name</Text>
          <TextInput
            value={name}
            onChangeText={(v) => setName(v.slice(0, 30))}
            placeholder="e.g. DeFi Blue Chips"
            placeholderTextColor={colors.textDim}
            className="px-4 py-3 rounded-xl text-white text-base"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight }}
            maxLength={30}
          />
          <Text className="text-stone-600 text-xs mt-1 text-right">{name.length}/30</Text>
        </View>

        {/* Description */}
        <View className="mb-5">
          <Text className="text-stone-400 text-xs uppercase tracking-wider mb-2">Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your strategy..."
            placeholderTextColor={colors.textDim}
            className="px-4 py-3 rounded-xl text-white text-sm"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.borderLight,
              minHeight: 100,
              textAlignVertical: 'top',
            }}
            multiline
          />
        </View>

        {/* Summary */}
        <View className="p-4 rounded-xl mb-6" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight }}>
          <Text className="text-stone-400 text-xs uppercase tracking-wider mb-3">Summary</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-stone-500 text-sm">Assets</Text>
            <Text className="text-white text-sm font-medium">{tokens.length}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-stone-500 text-sm">Fee</Text>
            <Text className="text-white text-sm font-medium">1.0%</Text>
          </View>
        </View>

        {/* Deploy button */}
        <Pressable
          onPress={() => isValid && onComplete({ name: name.trim(), ticker: ticker.trim(), description: description.trim() })}
          className="py-4 rounded-xl items-center mb-8"
          style={{
            backgroundColor: isValid ? colors.accent : colors.surfaceLight,
            opacity: isValid ? 1 : 0.5,
          }}
          disabled={!isValid}
        >
          <Text className="text-white font-bold text-base">Continue to Deploy</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
