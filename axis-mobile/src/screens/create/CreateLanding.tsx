import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { colors, serifFont } from '../../config/theme';

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

        <Text className="text-3xl font-bold text-center mb-3" style={{ color: colors.accent, fontFamily: serifFont }}>
          Your Idea.{'\n'}Your ETF.
        </Text>

        <Text className="text-center text-base mb-10 leading-6" style={{ color: colors.textMuted }}>
          Build, manage, and scale your on-chain index fund in seconds.
        </Text>

        <Pressable onPress={onCreate} className="rounded-xl overflow-hidden">
          <LinearGradient
            colors={['#6B4420', '#B8863F', '#E8C890']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ paddingHorizontal: 40, paddingVertical: 16, borderRadius: 12 }}
          >
            <Text className="font-bold text-base" style={{ color: '#000' }}>Create Strategy</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}
