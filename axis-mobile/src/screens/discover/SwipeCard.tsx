import React, { useState, useEffect } from 'react';
import { View, Text, Image, Pressable, Dimensions, Linking } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { TrendingUp, TrendingDown, Clock, Copy, ExternalLink, Wallet } from 'lucide-react-native';
import { colors } from '../../config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

// --- Types ---
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
  creatorPfpUrl?: string | null;
  description?: string;
  createdAt: number;
  mintAddress?: string;
}

interface Props {
  strategy: StrategyCardData;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
  isTop: boolean;
  index: number;
}

// --- Helpers ---

const formatPrice = (price: any) => {
  const p = Number(price);
  if (isNaN(p) || p === 0) return '$0.00';
  if (p < 0.000001) return '$' + p.toFixed(8);
  if (p < 0.01) return '$' + p.toFixed(6);
  if (p < 1) return '$' + p.toFixed(4);
  return '$' + p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const timeAgo = (timestamp: number) => {
  if (!timestamp) return 'Recently';
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  const days = Math.floor(seconds / 86400);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
};

// --- Sub Components ---

const FormatChange = ({ value, className, iconSize = 14 }: { value: any, className?: string, iconSize?: number }) => {
  const c = Number(value);
  if (isNaN(c) || !isFinite(c)) {
    return <Text className={`font-bold text-stone-500 ${className}`}>0.00%</Text>;
  }
  const isPositive = c >= 0;
  return (
    <View className="flex-row items-center justify-center">
      {isPositive ? (
        <TrendingUp size={iconSize} color="#10B981" style={{ marginRight: 4 }} />
      ) : (
        <TrendingDown size={iconSize} color="#EF4444" style={{ marginRight: 4 }} />
      )}
      <Text className={`font-extrabold ${isPositive ? 'text-emerald-500' : 'text-red-500'} ${className}`}>
        {Math.abs(c).toFixed(2)}%
      </Text>
    </View>
  );
};

const TokenIcon = ({ symbol, src, address }: { symbol: string, src?: string | null, address?: string }) => {
  const getInitialSrc = () => {
    if (src && src.startsWith('http')) return src;
    if (address) return `https://static.jup.ag/tokens/${address}.png`; 
    return `https://jup.ag/tokens/${symbol}.svg`;
  };

  const [imgSrc, setImgSrc] = useState<string>(getInitialSrc());
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    setErrorCount(0);
    setImgSrc(getInitialSrc());
  }, [src, address, symbol]);

  const handleError = () => {
    const nextCount = errorCount + 1;
    setErrorCount(nextCount);
    if (nextCount === 1) {
      if (address) {
        setImgSrc(`https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${address}/logo.png`);
      } else {
        setImgSrc(`https://ui-avatars.com/api/?name=${symbol}&background=random&color=fff&size=128&bold=true`);
      }
    } else if (nextCount === 2) {
      setImgSrc(`https://ui-avatars.com/api/?name=${symbol}&background=random&color=fff&size=128&bold=true`);
    }
  };

  return (
    <Image 
      source={{ uri: imgSrc }}
      className="w-full h-full rounded-full"
      style={{ backgroundColor: '#333' }}
      onError={handleError}
    />
  );
};

// --- Constants ---
const typeStyles = {
  AGGRESSIVE: { text: 'text-orange-500', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.2)' },
  BALANCED: { text: 'text-blue-500', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)' },
  CONSERVATIVE: { text: 'text-emerald-500', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)' },
};

// --- Main Component ---
export function SwipeCard({ strategy, onSwipeLeft, onSwipeRight, onTap, isTop, index }: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.2; // 少し動きを抑える
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
    const rotate = interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-10, 0, 10]);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + index * 10 }, // 少しずらす
        { rotate: `${rotate}deg` },
        { scale: 1 - index * 0.05 },
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [20, SWIPE_THRESHOLD], [0, 1]),
  }));

  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, -20], [1, 0]),
  }));

  const isPositive = strategy.roi >= 0;
  const currentTypeStyle = typeStyles[strategy.type] || typeStyles.BALANCED;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          cardStyle,
          {
            position: 'absolute',
            width: '100%',
            height: '100%',
            zIndex: 100 - index,
          },
        ]}
      >
        <Pressable 
          onPress={isTop ? onTap : undefined}
          style={{ flex: 1 }}
        >
          <View
            className="w-full h-full rounded-[32px] overflow-hidden shadow-2xl relative"
            style={{
              backgroundColor: '#121212',
              borderColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
            }}
          >
            {/* Background Glow Effect */}
            <View 
              className="absolute inset-0 opacity-60"
              style={{
                backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.03)' : 'rgba(239, 68, 68, 0.03)',
              }} 
            />
            {/* Gradient Overlay Simulation (Top Left) */}
            <View 
              className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-20"
              style={{
                backgroundColor: isPositive ? '#10B981' : '#EF4444',
                transform: [{ translateX: -80 }, { translateY: -80 }],
                shadowOpacity: 0.5,
                shadowRadius: 50,
              }} 
            />

            {/* Swipe Indicators */}
            <Animated.View
              style={[likeOpacity, { position: 'absolute', top: 40, left: 40, zIndex: 50, transform: [{ rotate: '-12deg' }] }]}
            >
              <View className="border-[6px] border-emerald-500 bg-black/40 px-4 py-2 rounded-xl">
                <Text className="text-emerald-500 font-black text-4xl">LIKE</Text>
              </View>
            </Animated.View>
            <Animated.View
              style={[nopeOpacity, { position: 'absolute', top: 40, right: 40, zIndex: 50, transform: [{ rotate: '12deg' }] }]}
            >
              <View className="border-[6px] border-red-500 bg-black/40 px-4 py-2 rounded-xl">
                <Text className="text-red-500 font-black text-4xl">PASS</Text>
              </View>
            </Animated.View>

            {/* --- Content --- */}
            
            {/* Header */}
            <View className="p-5 pb-2">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                  <View 
                    className="self-start px-2 py-0.5 rounded-full border mb-2"
                    style={{ 
                      backgroundColor: currentTypeStyle.bg,
                      borderColor: currentTypeStyle.border 
                    }}
                  >
                    <Text className={`text-[10px] font-bold uppercase ${currentTypeStyle.text}`}>
                      {strategy.type}
                    </Text>
                  </View>
                  <Text className="text-2xl font-bold text-white leading-tight" numberOfLines={1}>
                    ${strategy.ticker || strategy.name}
                  </Text>
                  {strategy.ticker && (
                    <Text className="text-xs text-white/40 mt-0.5" numberOfLines={1}>
                      {strategy.name}
                    </Text>
                  )}
                </View>

                {/* Creator PFP */}
                <View className="items-center">
                  <View className="w-10 h-10 rounded-full bg-[#292524] p-0.5 border border-white/10 overflow-hidden">
                    <Image
                      source={{ uri: strategy.creatorPfpUrl || `https://api.dicebear.com/7.x/identicon/png?seed=${strategy.creatorAddress}` }}
                      className="w-full h-full rounded-full"
                    />
                  </View>
                  <Text className="text-[9px] text-white/40 mt-1 font-mono">
                    {strategy.creatorAddress.slice(0, 4)}
                  </Text>
                </View>
              </View>

              <Text className="text-xs text-white/60 leading-4 min-h-[32px]" numberOfLines={2}>
                {strategy.description || "No description provided."}
              </Text>

              <View className="flex-row items-center gap-3 mt-3">
                <View className="flex-row items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                  <Text className="text-[10px] text-white/40 font-mono">
                    {strategy.id.slice(0, 4)}...{strategy.id.slice(-4)}
                  </Text>
                  <Copy size={10} color="rgba(255,255,255,0.2)" />
                </View>
                <View className="flex-row items-center gap-1">
                  <Clock size={10} color="rgba(255,255,255,0.4)" />
                  <Text className="text-[10px] text-white/40">{timeAgo(strategy.createdAt)}</Text>
                </View>
              </View>
            </View>

            {/* Stats Grid */}
            <View className="px-5 py-2 flex-row gap-2">
              {/* 24h Change Card */}
              <View 
                className="flex-1 p-3 rounded-2xl border items-center justify-center h-24"
                style={{
                  backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  borderColor: isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                }}
              >
                <Text className={`text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70 ${isPositive ? 'text-emerald-300' : 'text-red-300'}`}>
                  24h Change
                </Text>
                <FormatChange value={strategy.roi} className="text-3xl" iconSize={24} />
              </View>

              {/* TVL Card */}
              <View className="flex-1 p-3 bg-white/5 border border-white/5 rounded-2xl justify-center px-3 h-24">
                <Text className="text-[10px] text-white/40 uppercase font-bold mb-1">TVL</Text>
                <Text className="text-2xl font-bold text-white">
                  {strategy.tvl < 0.01 ? '< 0.01' : strategy.tvl.toFixed(2)}
                </Text>
                <Text className="text-xs text-white/50 font-normal">SOL</Text>
              </View>
            </View>

            {/* Composition List */}
            <View className="flex-1 px-5 py-2 overflow-hidden">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-1">
                  <Wallet size={12} color="rgba(255,255,255,0.4)" />
                  <Text className="text-xs font-bold text-white/40 uppercase tracking-widest">
                    Composition
                  </Text>
                </View>
                <Text className="text-[10px] text-white/20">{strategy.tokens.length} Assets</Text>
              </View>

              {/* In Swipe Cards, we usually limit items to avoid scrolling issues, or use nested scrolling carefully */}
              <View className="flex-1">
                {strategy.tokens.slice(0, 4).map((token, i) => (
                  <View 
                    key={i} 
                    className="flex-row items-center justify-between p-3 mb-2 rounded-xl border"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderColor: 'rgba(255,255,255,0.05)'
                    }}
                  >
                    {/* Left */}
                    <View className="flex-row items-center gap-3">
                      <View className="w-9 h-9 rounded-full bg-white/10 overflow-hidden border border-white/5">
                        <TokenIcon 
                          symbol={token.symbol} 
                          src={token.logoURI} 
                          address={token.address} 
                        />
                      </View>
                      <View>
                        <Text className="font-bold text-sm text-white">{token.symbol}</Text>
                        <Text className="text-[11px] text-white/50 font-mono">
                          {formatPrice(token.currentPrice)}
                        </Text>
                      </View>
                    </View>

                    {/* Right */}
                    <View className="items-end min-w-[60px]">
                      <Text className="font-bold text-sm text-white mb-0.5">{token.weight}%</Text>
                      {token.change24h !== undefined ? (
                        <FormatChange value={token.change24h} className="text-[10px]" iconSize={10} />
                      ) : (
                        <View className="w-full h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden" style={{ width: 40 }}>
                          <View 
                            className="h-full bg-orange-500 rounded-full" 
                            style={{ width: `${token.weight}%` }} 
                          />
                        </View>
                      )}
                    </View>
                  </View>
                ))}
                {strategy.tokens.length > 4 && (
                  <Text className="text-center text-[10px] text-white/20 mt-1">
                    +{strategy.tokens.length - 4} more assets
                  </Text>
                )}
              </View>
            </View>

            {/* Footer */}
            <Pressable
              onPress={() => {
                const url = `https://solscan.io/token/${strategy.mintAddress || strategy.id}?cluster=devnet`;
                Linking.openURL(url);
              }}
              className="p-3 border-t bg-[#0C0A09] flex-row justify-center items-center gap-1"
              style={{ borderColor: 'rgba(255,255,255,0.05)' }}
            >
              <Text className="text-[10px] text-white/20 font-mono">
                Address: {(strategy.mintAddress || strategy.id).slice(0, 8)}...
              </Text>
              <ExternalLink size={10} color="rgba(255,255,255,0.2)" />
            </Pressable>

          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}