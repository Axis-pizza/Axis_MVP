import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, FlatList, Pressable, Image, ActivityIndicator } from 'react-native';
import { Search, Plus, Minus, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { JupiterService, type JupiterToken } from '../../services/jupiter';
import { colors } from '../../config/theme';

interface TokenAlloc {
  symbol: string;
  address: string;
  weight: number;
  logoURI?: string;
}

interface Props {
  onComplete: (tokens: TokenAlloc[]) => void;
}

const TABS = ['all', 'trending', 'meme'] as const;
type Tab = typeof TABS[number];

export function ManualBuilder({ onComplete }: Props) {
  const [allTokens, setAllTokens] = useState<JupiterToken[]>([]);
  const [portfolio, setPortfolio] = useState<TokenAlloc[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [loading, setLoading] = useState(true);
  const [trendingIds, setTrendingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      setLoading(true);
      const [tokens, trending] = await Promise.all([
        JupiterService.getLiteList(),
        JupiterService.getTrendingTokens(),
      ]);
      setAllTokens(tokens);
      setTrendingIds(new Set(trending));
    } catch (e) {
      console.error('Load tokens error:', e);
    } finally {
      setLoading(false);
    }
  };

  const displayTokens = useMemo(() => {
    let list = allTokens;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q)
      );
    }

    switch (activeTab) {
      case 'trending':
        list = list.filter(t => trendingIds.has(t.address));
        break;
      case 'meme':
        list = list.filter(t => t.tags?.includes('meme') || t.tags?.includes('pump'));
        break;
    }

    return list.slice(0, 100);
  }, [allTokens, searchQuery, activeTab, trendingIds]);

  const totalWeight = portfolio.reduce((s, t) => s + t.weight, 0);
  const isValid = totalWeight === 100 && portfolio.length >= 2;

  const addToken = (token: JupiterToken) => {
    if (portfolio.find(t => t.address === token.address)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newToken: TokenAlloc = {
      symbol: token.symbol,
      address: token.address,
      weight: 0,
      logoURI: token.logoURI,
    };
    const updated = [...portfolio, newToken];
    const even = Math.floor(100 / updated.length);
    const distributed = updated.map((t, i) => ({
      ...t,
      weight: i === updated.length - 1 ? 100 - even * (updated.length - 1) : even,
    }));
    setPortfolio(distributed);
  };

  const removeToken = (address: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = portfolio.filter(t => t.address !== address);
    if (updated.length === 0) {
      setPortfolio([]);
      return;
    }
    const even = Math.floor(100 / updated.length);
    const distributed = updated.map((t, i) => ({
      ...t,
      weight: i === updated.length - 1 ? 100 - even * (updated.length - 1) : even,
    }));
    setPortfolio(distributed);
  };

  const updateWeight = (address: string, weight: number) => {
    setPortfolio(prev => prev.map(t =>
      t.address === address ? { ...t, weight: Math.max(0, Math.min(100, weight)) } : t
    ));
  };

  const isInPortfolio = (address: string) => portfolio.some(t => t.address === address);

  const renderTokenItem = ({ item }: { item: JupiterToken }) => {
    const inPortfolio = isInPortfolio(item.address);
    return (
      <Pressable
        onPress={() => inPortfolio ? removeToken(item.address) : addToken(item)}
        className="flex-row items-center py-3 px-4"
        style={{ borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
      >
        {item.logoURI ? (
          <Image source={{ uri: item.logoURI }} className="w-8 h-8 rounded-full" />
        ) : (
          <View className="w-8 h-8 rounded-full" style={{ backgroundColor: colors.surfaceLight }} />
        )}
        <View className="flex-1 ml-3">
          <Text className="font-medium text-sm" style={{ color: colors.text }}>{item.symbol}</Text>
          <Text className="text-xs" numberOfLines={1} style={{ color: colors.textMuted }}>{item.name}</Text>
        </View>
        <View className="w-8 h-8 rounded-full items-center justify-center" style={{
          backgroundColor: inPortfolio ? colors.accent : colors.surfaceLight,
        }}>
          {inPortfolio ? (
            <Check size={16} color="#000" />
          ) : (
            <Plus size={16} color={colors.textMuted} />
          )}
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
      {/* Portfolio preview */}
      {portfolio.length > 0 && (
        <View className="mx-4 mb-3 p-3 rounded-xl" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs" style={{ color: colors.textSecondary }}>{portfolio.length} tokens selected</Text>
            <Text style={{ color: totalWeight === 100 ? colors.positive : colors.negative, fontSize: 12, fontWeight: '600' }}>
              {totalWeight}%
            </Text>
          </View>

          {portfolio.map(token => (
            <View key={token.address} className="flex-row items-center py-1.5">
              {token.logoURI ? (
                <Image source={{ uri: token.logoURI }} className="w-5 h-5 rounded-full" />
              ) : (
                <View className="w-5 h-5 rounded-full" style={{ backgroundColor: colors.surfaceLight }} />
              )}
              <Text className="text-xs ml-2 flex-1" style={{ color: colors.text }}>{token.symbol}</Text>

              <View className="flex-row items-center gap-2">
                <Pressable onPress={() => updateWeight(token.address, token.weight - 5)}>
                  <Minus size={14} color={colors.textMuted} />
                </Pressable>
                <Text className="text-xs w-8 text-center" style={{ color: colors.text }}>{token.weight}%</Text>
                <Pressable onPress={() => updateWeight(token.address, token.weight + 5)}>
                  <Plus size={14} color={colors.textMuted} />
                </Pressable>
                <Pressable onPress={() => removeToken(token.address)} className="ml-1">
                  <Text className="text-xs" style={{ color: colors.textMuted }}>x</Text>
                </Pressable>
              </View>
            </View>
          ))}

          {isValid && (
            <Pressable onPress={() => onComplete(portfolio)} className="mt-3 rounded-xl overflow-hidden">
              <LinearGradient
                colors={['#6B4420', '#B8863F', '#E8C890']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
              >
                <Text className="font-bold" style={{ color: '#000' }}>Next</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      )}

      {/* Search */}
      <View className="mx-4 mb-2">
        <View className="flex-row items-center px-3 py-2 rounded-xl" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search tokens..."
            placeholderTextColor={colors.textMuted}
            className="flex-1 ml-2 text-sm"
            style={{ color: colors.text }}
          />
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row mx-4 mb-2 gap-2">
        {TABS.map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className="px-3 py-1 rounded-full"
            style={{
              backgroundColor: activeTab === tab ? `${colors.accent}20` : 'transparent',
              borderWidth: 1,
              borderColor: activeTab === tab ? colors.accent : colors.border,
            }}
          >
            <Text style={{ color: activeTab === tab ? colors.accent : colors.textMuted, fontSize: 12 }}>
              {tab === 'all' ? 'All' : tab === 'trending' ? 'Trending' : 'Meme'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Token list */}
      <FlatList
        data={displayTokens}
        keyExtractor={item => item.address}
        renderItem={renderTokenItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}
