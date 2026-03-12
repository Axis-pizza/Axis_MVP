import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { colors, serifFont } from '../../config/theme';

interface Props {
  onCreate: () => void;
  onCreateVault: () => void;
}

export function CreateLanding({ onCreate, onCreateVault }: Props) {
  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(100).duration(600)} style={{ alignItems: 'center', width: '100%' }}>
        <View
          style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: `${colors.accent}20` }}
        >
          <Sparkles size={32} color={colors.accent} />
        </View>

        <Text
          style={{ fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: colors.accent, fontFamily: serifFont }}
        >
          Your Idea.{'\n'}Your ETF.
        </Text>

        <Text
          style={{ textAlign: 'center', fontSize: 15, marginBottom: 32, lineHeight: 22, color: colors.textMuted }}
        >
          Build, manage, and scale your on-chain index fund in seconds.
        </Text>

        {/* Create Your Strategy */}
        <Pressable onPress={onCreateVault} style={{ width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
          <LinearGradient
            colors={['#1a2060', '#3a50cc', '#6382FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ paddingVertical: 16, alignItems: 'center', borderRadius: 12 }}
          >
            <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#fff' }}>
              Create Your Strategy
            </Text>
          </LinearGradient>
        </Pressable>

        {/* Create Your ETF */}
        <Pressable onPress={onCreate} style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }}>
          <LinearGradient
            colors={['#6B4420', '#B8863F', '#E8C890']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ paddingVertical: 16, alignItems: 'center', borderRadius: 12 }}
          >
            <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#000' }}>
              Create Your ETF
            </Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}
