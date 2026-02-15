import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Dimensions, FlatList, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { Shield, Compass, Plus, Rocket, X } from 'lucide-react-native';
import { colors, serifFont } from '../../config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TutorialOverlayProps {
  visible: boolean;
  onComplete: () => void;
  onConnectWallet?: () => void;
}

const SLIDES = [
  {
    badge: 'Welcome to Axis',
    title: 'Shadow Strategy',
    subtitle: 'Institutional-grade DeFi portfolios, powered by AI. Built on Solana.',
    Icon: Shield,
    accentColor: '#B8863F',
  },
  {
    badge: 'Discover',
    title: 'Scout Elite Alpha',
    subtitle: 'Swipe through community-built portfolios. Copy the best performers with one tap.',
    Icon: Compass,
    accentColor: '#D4A261',
  },
  {
    badge: 'Create',
    title: 'Forge Your ETF',
    subtitle: 'Select tokens, set allocations, and deploy an on-chain index fund in seconds.',
    Icon: Plus,
    accentColor: '#8B5E28',
  },
  {
    badge: 'Get Started',
    title: 'Enter the Market',
    subtitle: 'The shadow market awaits. Dive in now to explore strategies.',
    Icon: Rocket,
    accentColor: '#B8863F',
  },
];

export function TutorialOverlay({ visible, onComplete, onConnectWallet }: TutorialOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const isLast = currentIndex === SLIDES.length - 1;

  const handleConnect = () => {
    onConnectWallet?.();
    onComplete();
  };

  const renderSlide = ({ item, index }: { item: typeof SLIDES[0]; index: number }) => {
    const { Icon } = item;
    return (
      <View style={{ width: SCREEN_WIDTH, flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        {/* Orb Container */}
        <View style={{
          width: SCREEN_WIDTH * 0.85,
          aspectRatio: 1,
          maxWidth: 380,
          maxHeight: 380,
          borderRadius: 999,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          overflow: 'hidden',
          padding: 48,
        }}>
          {/* Inner Ring */}
          <View style={{
            position: 'absolute',
            top: 16, left: 16, right: 16, bottom: 16,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.05)',
          }} />

          {/* Icon */}
          <View style={{ marginBottom: 24 }}>
            <Icon size={40} color={item.accentColor} strokeWidth={2} />
          </View>

          {/* Badge */}
          <Text style={{
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: item.accentColor,
            marginBottom: 12,
          }}>
            {item.badge}
          </Text>

          {/* Title */}
          <Text style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: '#FFFFFF',
            fontFamily: serifFont,
            textAlign: 'center',
            marginBottom: 16,
            letterSpacing: -0.5,
          }}>
            {item.title}
          </Text>

          {/* Subtitle */}
          <Text style={{
            fontSize: 14,
            color: '#71717A',
            textAlign: 'center',
            lineHeight: 22,
            maxWidth: 260,
          }}>
            {item.subtitle}
          </Text>

          {/* CTA on last slide */}
          {index === SLIDES.length - 1 && (
            <View style={{ marginTop: 32, width: '100%', maxWidth: 220, gap: 12 }}>
              <Pressable onPress={onComplete} style={{ borderRadius: 999, overflow: 'hidden' }}>
                <LinearGradient
                  colors={['#6B4420', '#B8863F', '#E8C890']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ paddingVertical: 14, borderRadius: 999, alignItems: 'center' }}
                >
                  <Text style={{ color: '#140D07', fontWeight: 'bold', fontSize: 12, letterSpacing: 0.5 }}>
                    Enter Shadow Market
                  </Text>
                </LinearGradient>
              </Pressable>
              {onConnectWallet && (
                <Pressable onPress={handleConnect} style={{ paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#71717A', fontSize: 12, fontWeight: '500' }}>Connect Wallet</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent transparent={false}>
      <View style={{ flex: 1, backgroundColor: '#080503' }}>
        {/* Background Glow */}
        <View style={{
          position: 'absolute',
          top: '30%',
          left: '25%',
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: SLIDES[currentIndex].accentColor,
          opacity: 0.12,
          transform: [{ scale: 1.5 }],
        }} />

        {/* Skip Button */}
        <Pressable
          onPress={onComplete}
          style={{
            position: 'absolute',
            top: 56,
            right: 24,
            zIndex: 50,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.05)',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' }}>
            Skip
          </Text>
          <X size={12} color="rgba(255,255,255,0.4)" />
        </Pressable>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => i.toString()}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentIndex(index);
          }}
        />

        {/* Dots */}
        <View style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 16,
        }}>
          {SLIDES.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => {
                setCurrentIndex(i);
                flatListRef.current?.scrollToIndex({ index: i, animated: true });
              }}
              style={{ padding: 8 }}
            >
              <View style={{
                width: i === currentIndex ? 12 : 6,
                height: i === currentIndex ? 12 : 6,
                borderRadius: 6,
                backgroundColor: i === currentIndex ? SLIDES[currentIndex].accentColor : 'rgba(255,255,255,0.2)',
                borderWidth: i === currentIndex ? 1 : 0,
                borderColor: SLIDES[currentIndex].accentColor,
              }} />
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}
