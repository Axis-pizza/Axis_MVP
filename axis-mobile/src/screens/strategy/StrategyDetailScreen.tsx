import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { ArrowLeft, Star, Copy, ExternalLink } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { api } from '../../services/api';
import { JupiterService } from '../../services/jupiter';
import { DexScreenerService } from '../../services/dexscreener';
import { useToast } from '../../components/common/context/ToastContext';
import { colors } from '../../config/theme';
import type { RootStackParamList } from '../../navigation/types';

type DetailRoute = RouteProp<RootStackParamList, 'StrategyDetail'>;

export function StrategyDetailScreen() {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { strategy } = route.params;

  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [tokenPrices, setTokenPrices] = useState<Record<string, { price: number; change24h: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetails();
  }, []);

  const loadDetails = async () => {
    try {
      const mints = (strategy.tokens || [])
        .map(t => t.address || t.mint)
        .filter((m): m is string => !!m && m.length > 30);

      if (mints.length > 0) {
        const dexData = await DexScreenerService.getMarketData(mints);
        setTokenPrices(dexData);
      }
    } catch (e) {
      console.error('Load detail error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = async () => {
    const addr = strategy.address || strategy.config?.strategyPubkey;
    if (addr) {
      await Clipboard.setStringAsync(addr as string);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Address copied', 'success');
    }
  };

  const typeColor = {
    AGGRESSIVE: colors.aggressive,
    BALANCED: colors.balanced,
    CONSERVATIVE: colors.conservative,
  }[strategy.type] || colors.balanced;

  const formatPrice = (price: number): string => {
    if (!price || price === 0) return '$0.00';
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-3" style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => navigation.goBack()} className="p-2">
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => setIsWatchlisted(!isWatchlisted)} className="p-2">
            <Star
              size={22}
              color={isWatchlisted ? colors.accent : colors.textDim}
              fill={isWatchlisted ? colors.accent : 'none'}
            />
          </Pressable>
          <Pressable onPress={handleCopyAddress} className="p-2">
            <Copy size={20} color={colors.textDim} />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Strategy header */}
        <View className="px-4 mb-6">
          <View className="flex-row items-center gap-2 mb-2">
            <View className="px-2 py-1 rounded" style={{ backgroundColor: `${typeColor}20` }}>
              <Text style={{ color: typeColor, fontSize: 10, fontWeight: '700' }}>{strategy.type}</Text>
            </View>
            {strategy.ticker && (
              <Text className="text-stone-500 text-sm">${strategy.ticker}</Text>
            )}
          </View>
          <Text className="text-white text-2xl font-bold" style={{ fontFamily: 'serif' }}>
            {strategy.name}
          </Text>
          {strategy.description && (
            <Text className="text-stone-500 text-sm mt-2">{strategy.description}</Text>
          )}
        </View>

        {/* Stats */}
        <View className="flex-row mx-4 mb-6 gap-3">
          <View className="flex-1 p-3 rounded-xl items-center" style={{ backgroundColor: colors.surface }}>
            <Text className="text-stone-500 text-xs">TVL</Text>
            <Text className="text-white font-bold mt-1">
              {typeof strategy.tvl === 'number' ? `${Number(strategy.tvl).toFixed(2)} SOL` : strategy.tvl || '0'}
            </Text>
          </View>
          {strategy.metrics && (
            <>
              <View className="flex-1 p-3 rounded-xl items-center" style={{ backgroundColor: colors.surface }}>
                <Text className="text-stone-500 text-xs">APY</Text>
                <Text className="text-white font-bold mt-1">
                  {strategy.metrics.expectedApy?.toFixed(1)}%
                </Text>
              </View>
              <View className="flex-1 p-3 rounded-xl items-center" style={{ backgroundColor: colors.surface }}>
                <Text className="text-stone-500 text-xs">Risk</Text>
                <Text className="text-white font-bold mt-1">
                  {strategy.metrics.riskScore}/10
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Token composition */}
        <View className="mx-4 p-4 rounded-xl mb-6" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight }}>
          <Text className="text-stone-400 text-xs uppercase tracking-wider mb-3">Composition</Text>
          {(strategy.tokens || []).map((token, i) => {
            const addr = token.address || token.mint || '';
            const priceData = tokenPrices[addr];
            return (
              <View key={i} className="flex-row items-center py-2.5" style={{ borderBottomWidth: i < strategy.tokens.length - 1 ? 1 : 0, borderBottomColor: colors.borderLight }}>
                {token.logoURI ? (
                  <Image source={{ uri: token.logoURI }} className="w-8 h-8 rounded-full" />
                ) : (
                  <View className="w-8 h-8 rounded-full" style={{ backgroundColor: colors.surfaceLight }} />
                )}
                <View className="flex-1 ml-3">
                  <Text className="text-white font-medium">{token.symbol}</Text>
                  <Text className="text-stone-600 text-xs">{token.weight}%</Text>
                </View>
                <View className="items-end">
                  {priceData && (
                    <>
                      <Text className="text-stone-400 text-xs">{formatPrice(priceData.price)}</Text>
                      <Text
                        style={{
                          color: priceData.change24h >= 0 ? colors.positive : colors.negative,
                          fontSize: 10,
                        }}
                      >
                        {priceData.change24h >= 0 ? '+' : ''}{priceData.change24h.toFixed(2)}%
                      </Text>
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom action bar */}
      <View
        className="absolute left-0 right-0 px-4 pb-2"
        style={{ bottom: insets.bottom + 8 }}
      >
        <Pressable
          className="py-4 rounded-xl items-center"
          style={{ backgroundColor: colors.accent }}
          onPress={() => showToast('Trading not yet available on mobile', 'info')}
        >
          <Text className="text-white font-bold text-base">Trade</Text>
        </Pressable>
      </View>
    </View>
  );
}
