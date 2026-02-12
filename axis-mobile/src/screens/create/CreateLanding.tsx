import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Sparkles } from 'lucide-react-native';
import { colors } from '../../config/theme';

interface Props {
  onCreate: () => void;
}

export function CreateLanding({ onCreate }: Props) {
  return (
    <View className="flex-1 justify-center items-center px-8">
      <Animated.View entering={FadeInDown.delay(100).duration(600)} className="items-center">
        <View className="w-16 h-16 rounded-full items-center justify-center mb-6" style={{ backgroundColor: `${colors.accent}20` }}>
          <Sparkles size={32} color={colors.accent} />
        </View>

        <Text className="text-white text-3xl font-bold text-center mb-3" style={{ fontFamily: 'serif' }}>
          Your Idea.{'\n'}Your ETF.
        </Text>

        <Text className="text-stone-500 text-center text-base mb-10 leading-6">
          Build, manage, and scale your on-chain index fund in seconds.
        </Text>

        <Pressable
          onPress={onCreate}
          className="px-10 py-4 rounded-xl"
          style={{ backgroundColor: colors.accent }}
        >
          <Text className="text-white font-bold text-base">Create Strategy</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
