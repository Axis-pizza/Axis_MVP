import React from 'react';
import { View, Text, Image, Pressable, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react-native';
import { colors } from '../../config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface Token {
  symbol: string;
  weight: number;
  address?: string;
  logoURI?: string | null;
  currentPrice?: number;
  change24h?: number;
}

interface StrategyCardData {
  id: string;
  name: string;
  ticker?: string;
  type: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  tokens: Token[];
  roi: number;
  tvl: number;
  creatorAddress: string;
  description?: string;
  createdAt: number;
}

interface Props {
  strategy: StrategyCardData;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
  isTop: boolean;
  index: number;
}

function formatPrice(price: number): string {
  if (!price || price === 0) return '$0.00';
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(8)}`;
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const typeColors: Record<string, string> = {
  AGGRESSIVE: colors.aggressive,
  BALANCED: colors.balanced,
  CONSERVATIVE: colors.conservative,
};

export function SwipeCard({ strategy, onSwipeLeft, onSwipeRight, onTap, isTop, index }: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, { damping: 15 });
        runOnJS(onSwipeRight)();
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { damping: 15 });
        runOnJS(onSwipeLeft)();
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-15, 0, 15]);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + index * 8 },
        { rotate: `${rotate}deg` },
        { scale: 1 - index * 0.04 },
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1]),
  }));

  const passOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0]),
  }));

  const typeColor = typeColors[strategy.type] || colors.balanced;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          cardStyle,
          {
            position: 'absolute',
            width: '100%',
            zIndex: 10 - index,
          },
        ]}
      >
        <Pressable onPress={isTop ? onTap : undefined}>
          <View
            className="rounded-2xl overflow-hidden p-5"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.borderLight,
              minHeight: 420,
            }}
          >
            {/* LIKE/PASS indicators */}
            <Animated.View
              style={[likeOpacity, { position: 'absolute', top: 20, right: 20, zIndex: 20 }]}
            >
              <View className="px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', borderWidth: 2, borderColor: colors.positive }}>
                <Text style={{ color: colors.positive, fontWeight: 'bold', fontSize: 18 }}>LIKE</Text>
              </View>
            </Animated.View>
            <Animated.View
              style={[passOpacity, { position: 'absolute', top: 20, left: 20, zIndex: 20 }]}
            >
              <View className="px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 2, borderColor: colors.negative }}>
                <Text style={{ color: colors.negative, fontWeight: 'bold', fontSize: 18 }}>PASS</Text>
              </View>
            </Animated.View>

            {/* Header */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className="px-2 py-1 rounded" style={{ backgroundColor: `${typeColor}20` }}>
                  <Text style={{ color: typeColor, fontSize: 10, fontWeight: '700' }}>{strategy.type}</Text>
                </View>
                {strategy.ticker && (
                  <Text className="text-stone-500 text-xs">${strategy.ticker}</Text>
                )}
              </View>
              <Text className="text-stone-600 text-xs">{timeAgo(strategy.createdAt)}</Text>
            </View>

            {/* Name */}
            <Text className="text-white text-xl font-bold mb-1" numberOfLines={1}>{strategy.name}</Text>
            {strategy.description && (
              <Text className="text-stone-500 text-xs mb-4" numberOfLines={2}>{strategy.description}</Text>
            )}

            {/* ROI & TVL */}
            <View className="flex-row items-center gap-4 mb-4">
              <View className="flex-row items-center gap-1">
                {strategy.roi >= 0 ? (
                  <TrendingUp size={14} color={colors.positive} />
                ) : (
                  <TrendingDown size={14} color={colors.negative} />
                )}
                <Text style={{ color: strategy.roi >= 0 ? colors.positive : colors.negative, fontWeight: '700', fontSize: 16 }}>
                  {strategy.roi >= 0 ? '+' : ''}{strategy.roi.toFixed(2)}%
                </Text>
                <Text className="text-stone-600 text-xs ml-1">24h</Text>
              </View>
              <View>
                <Text className="text-stone-500 text-xs">TVL</Text>
                <Text className="text-white font-semibold">
                  {typeof strategy.tvl === 'number' ? `${strategy.tvl.toFixed(2)} SOL` : strategy.tvl}
                </Text>
              </View>
            </View>

            {/* Token list */}
            <View className="gap-2">
              {strategy.tokens.slice(0, 5).map((token, i) => (
                <View key={i} className="flex-row items-center justify-between py-1.5">
                  <View className="flex-row items-center gap-2 flex-1">
                    {token.logoURI ? (
                      <Image
                        source={{ uri: token.logoURI }}
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: colors.surfaceLight }}
                      />
                    ) : (
                      <View className="w-6 h-6 rounded-full" style={{ backgroundColor: colors.surfaceLight }} />
                    )}
                    <Text className="text-white text-sm font-medium">{token.symbol}</Text>
                    <Text className="text-stone-600 text-xs">{token.weight}%</Text>
                  </View>
                  <View className="items-end">
                    {token.currentPrice != null && (
                      <Text className="text-stone-400 text-xs">{formatPrice(token.currentPrice)}</Text>
                    )}
                    {token.change24h != null && (
                      <Text
                        style={{ color: token.change24h >= 0 ? colors.positive : colors.negative, fontSize: 10 }}
                      >
                        {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}
