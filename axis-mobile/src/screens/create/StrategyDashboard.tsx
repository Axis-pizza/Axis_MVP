import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Plus } from 'lucide-react-native';
import { api } from '../../services/api';
import { useWallet } from '../../context/WalletContext';
import { colors, serifFont } from '../../config/theme';

interface Props {
  onCreateNew: () => void;
}

export function StrategyDashboard({ onCreateNew }: Props) {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { publicKey } = useWallet();

  useEffect(() => {
    loadStrategies();
  }, [publicKey]);

  const loadStrategies = async () => {
    if (!publicKey) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.getUserStrategies(publicKey);
      setStrategies(res.strategies || res || []);
    } catch (e) {
      console.error('Load user strategies error:', e);
    } finally {
      setLoading(false);
    }
  };

  const typeColors: Record<string, string> = {
    AGGRESSIVE: colors.aggressive,
    BALANCED: colors.balanced,
    CONSERVATIVE: colors.conservative,
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View className="flex-1 px-4 pt-4">
      <Text className="text-xl font-bold mb-4" style={{ color: colors.text, fontFamily: serifFont }}>Your Strategies</Text>

      <FlatList
        data={strategies}
        keyExtractor={(item: any) => item.id || item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-base mb-2" style={{ color: colors.textMuted }}>No strategies yet</Text>
            <Text className="text-sm" style={{ color: colors.textMuted }}>Create your first index fund!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const typeColor = typeColors[item.type] || colors.balanced;
          return (
            <View
              className="p-4 rounded-xl mb-3"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-bold text-base" style={{ color: colors.text }}>{item.name}</Text>
                <View className="px-2 py-0.5 rounded" style={{ backgroundColor: `${typeColor}20` }}>
                  <Text style={{ color: typeColor, fontSize: 10, fontWeight: '700' }}>{item.type}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-4">
                <View>
                  <Text className="text-xs" style={{ color: colors.textMuted }}>TVL</Text>
                  <Text className="text-sm" style={{ color: colors.text }}>{item.tvl || 0} SOL</Text>
                </View>
                <View>
                  <Text className="text-xs" style={{ color: colors.textMuted }}>Assets</Text>
                  <Text className="text-sm" style={{ color: colors.text }}>{item.tokens?.length || 0}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Create new button */}
      <Pressable
        onPress={onCreateNew}
        className="absolute bottom-24 right-4 w-14 h-14 rounded-full items-center justify-center"
        style={{ backgroundColor: colors.accent }}
      >
        <Plus size={24} color="#000" />
      </Pressable>
    </View>
  );
}
