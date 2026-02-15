import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, FlatList, Pressable, Image, ActivityIndicator } from 'react-native';
import { Search } from 'lucide-react-native';
import { api } from '../../services/api';
import { colors } from '../../config/theme';
import type { Strategy } from '../../types';

interface Props {
  onStrategySelect: (strategy: Strategy) => void;
}

const FILTERS = ['all', 'trending', 'new', 'top'] as const;
type Filter = typeof FILTERS[number];

const filterLabels: Record<Filter, string> = {
  all: 'All',
  trending: 'Hot',
  new: 'New',
  top: 'Top TVL',
};

export function ListDiscoverView({ onStrategySelect }: Props) {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    try {
      setLoading(true);
      const res = await api.discoverStrategies(50);
      setStrategies(res.strategies || res || []);
    } catch (e) {
      console.error('Load strategies error:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = strategies;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s: any) =>
        s.name?.toLowerCase().includes(q) ||
        s.ticker?.toLowerCase().includes(q)
      );
    }

    switch (filter) {
      case 'new':
        list = [...list].sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
      case 'top':
        list = [...list].sort((a: any, b: any) => (b.tvl || 0) - (a.tvl || 0));
        break;
      default:
        break;
    }

    return list;
  }, [strategies, search, filter]);

  const typeColors: Record<string, string> = {
    AGGRESSIVE: colors.aggressive,
    BALANCED: colors.balanced,
    CONSERVATIVE: colors.conservative,
  };

  const renderItem = ({ item }: { item: any }) => {
    const typeColor = typeColors[item.type] || colors.balanced;
    return (
      <Pressable onPress={() => onStrategySelect(item)} className="mx-4 mb-3">
        <View
          className="p-4 rounded-xl"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <Text className="font-bold text-base" numberOfLines={1} style={{ color: colors.text }}>{item.name}</Text>
              {item.ticker && (
                <Text className="text-xs" style={{ color: colors.textMuted }}>${item.ticker}</Text>
              )}
            </View>
            <View className="px-2 py-0.5 rounded" style={{ backgroundColor: `${typeColor}20` }}>
              <Text style={{ color: typeColor, fontSize: 10, fontWeight: '700' }}>{item.type}</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            {/* Token avatars */}
            <View className="flex-row -space-x-2">
              {(item.tokens || []).slice(0, 4).map((t: any, i: number) => (
                t.logoURI ? (
                  <Image
                    key={i}
                    source={{ uri: t.logoURI }}
                    className="w-6 h-6 rounded-full"
                    style={{ borderWidth: 1, borderColor: colors.surface, marginLeft: i > 0 ? -8 : 0 }}
                  />
                ) : (
                  <View
                    key={i}
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.surface, marginLeft: i > 0 ? -8 : 0 }}
                  />
                )
              ))}
            </View>

            <View className="flex-1" />

            <Text className="text-xs" style={{ color: colors.textSecondary }}>
              TVL: {typeof item.tvl === 'number' ? `${item.tvl.toFixed(1)} SOL` : item.tvl || '0'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Search */}
      <View className="mx-4 mb-3">
        <View
          className="flex-row items-center px-3 py-2.5 rounded-xl"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
        >
          <Search size={16} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search strategies..."
            placeholderTextColor={colors.textMuted}
            className="flex-1 ml-2 text-sm"
            style={{ color: colors.text }}
          />
        </View>
      </View>

      {/* Filters */}
      <View className="flex-row mx-4 mb-3 gap-2">
        {FILTERS.map(f => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: filter === f ? `${colors.accent}20` : colors.surface,
              borderWidth: 1,
              borderColor: filter === f ? colors.accent : colors.border,
            }}
          >
            <Text style={{ color: filter === f ? colors.accent : colors.textMuted, fontSize: 12, fontWeight: '600' }}>
              {filterLabels[f]}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id || item._id || Math.random().toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text style={{ color: colors.textMuted }}>No strategies found</Text>
          </View>
        }
      />
    </View>
  );
}
