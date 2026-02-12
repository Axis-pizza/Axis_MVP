import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Layers, List } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SwipeDiscoverView } from './SwipeDiscoverView';
import { ListDiscoverView } from './ListDiscoverView';
import { colors } from '../../config/theme';
import type { RootStackParamList } from '../../navigation/types';
import type { Strategy } from '../../types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export function DiscoverScreen() {
  const [viewMode, setViewMode] = useState<'swipe' | 'list'>('swipe');
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();

  const handleStrategySelect = (strategy: Strategy) => {
    navigation.navigate('StrategyDetail', { strategy });
  };

  const toggleView = async () => {
    const next = viewMode === 'swipe' ? 'list' : 'swipe';
    setViewMode(next);
    await AsyncStorage.setItem('axis-discover-view-mode', next);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-white text-xl font-bold">Discover</Text>
        <Pressable onPress={toggleView} className="p-2">
          {viewMode === 'swipe' ? (
            <List size={22} color={colors.textMuted} />
          ) : (
            <Layers size={22} color={colors.textMuted} />
          )}
        </Pressable>
      </View>

      {/* Content */}
      {viewMode === 'swipe' ? (
        <SwipeDiscoverView onStrategySelect={handleStrategySelect} />
      ) : (
        <ListDiscoverView onStrategySelect={handleStrategySelect} />
      )}
    </View>
  );
}
