import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Compass, Plus, Rocket, ChevronLeft, ChevronRight } from 'lucide-react';

interface TutorialOverlayProps {
  onComplete: () => void;
  onConnectWallet: () => void;
}

const SLIDES = [
  {
    badge: 'Welcome to Axis',
    title: 'The Shadow Strategy Factory',
    subtitle: 'Institutional-grade DeFi portfolios, powered by AI. Built on Solana.',
    icon: Shield,
    accentColor: '#D97706',
  },
  {
    badge: 'Discover',
    title: 'Scout Elite Strategies',
    subtitle: 'Swipe through community-built portfolios. Find alpha. Copy the best performers with one tap.',
    icon: Compass,
    accentColor: '#F59E0B',
  },
  {
    badge: 'Create',
    title: 'Forge Your Own ETF',
    subtitle: 'Select tokens, set allocations, and deploy an on-chain index fund in seconds. No code required.',
    icon: Plus,
    accentColor: '#D97706',
  },
  {
    badge: 'Get Started',
    title: 'Enter the Shadow Market',
    subtitle: 'Connect your Solana wallet to begin, or explore strategies as a guest.',
    icon: Rocket,
    accentColor: '#F59E0B',
  },
] as const;

const SWIPE_THRESHOLD = 50;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

export const TutorialOverlay = ({ onComplete, onConnectWallet }: TutorialOverlayProps) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const isLast = current === SLIDES.length - 1;
  const slide = SLIDES[current];
  const Icon = slide.icon;

  const goNext = useCallback(() => {
    if (current < SLIDES.length - 1) {
      setDirection(1);
      setCurrent(prev => prev + 1);
    }
  }, [current]);

  const goPrev = useCallback(() => {
    if (current > 0) {
      setDirection(-1);
      setCurrent(prev => prev - 1);
    }
  }, [current]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        goPrev();
      } else if (e.key === 'Escape') {
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, onComplete]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      goNext();
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      goPrev();
    }
  };

  const handleConnectWallet = () => {
    onComplete();
    onConnectWallet();
  };

  return createPortal(
    <View className="fixed inset-0 z-[1000000] bg-[#0C0A09] overflow-hidden">
      {/* Ambient glow background */}
      <View className="absolute inset-0 pointer-events-none">
        <motion.div
          key={`glow-${current}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ backgroundColor: slide.accentColor }}
        />
        <View className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full blur-[120px] opacity-10 bg-orange-700" />
        <View className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full blur-[120px] opacity-10 bg-amber-600" />
      </View>

      {/* Skip button */}
      <button
        onPress={onComplete}
        className="absolute top-12 right-6 z-50 text-white/30 hover:text-white/60 transition-colors text-[10px] tracking-[0.2em] uppercase"
      >
        Skip
      </button>

      {/* Slide content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 flex flex-col items-center justify-center px-8 cursor-grab active:cursor-grabbing"
        >
          <View className="flex flex-col items-center text-center max-w-sm">
            {/* Icon circle with glass effect */}
            <View className="relative mb-10">
              {/* Floating particles */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  animate={{
                    x: [0, (i - 1) * 30, 0],
                    y: [0, -20 - i * 10, 0],
                    opacity: [0.3, 0.7, 0.3],
                    scale: [0.8, 1.2, 0.8],
                  }}
                  transition={{
                    duration: 3 + i * 0.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.8,
                  }}
                  style={{
                    backgroundColor: slide.accentColor,
                    left: `${30 + i * 20}%`,
                    top: `${20 + i * 15}%`,
                  }}
                />
              ))}
              <View className="glass w-28 h-28 rounded-full flex items-center justify-center border border-white/10">
                <Icon
                  className="w-12 h-12"
                  style={{ color: slide.accentColor }}
                  strokeWidth={1.5}
                />
              </View>
            </View>

            {/* Badge */}
            <Text
              className="text-[10px] tracking-[0.3em] uppercase mb-4 font-medium"
              style={{ color: slide.accentColor }}
            >
              {slide.badge}
            </Text>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-serif text-white mb-4 tracking-tight leading-tight">
              {slide.title}
            </h1>

            {/* Subtitle */}
            <Text className="text-white/40 text-sm leading-relaxed font-light max-w-xs">
              {slide.subtitle}
            </Text>

            {/* CTA buttons on final slide */}
            {isLast && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-10 flex flex-col gap-3 w-full max-w-xs"
              >
                <button
                  onPress={handleConnectWallet}
                  className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm tracking-wide text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: '#D97706' }}
                >
                  Connect Wallet
                </button>
                <button
                  onPress={onComplete}
                  className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm tracking-wide text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Explore as Guest
                </button>
              </motion.div>
            )}
          </View>
        </motion.div>
      </AnimatePresence>

      {/* Page indicator dots */}
      <View className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-3 z-50">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onPress={() => {
              setDirection(i > current ? 1 : -1);
              setCurrent(i);
            }}
            className="group p-1"
          >
            <View
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-6 h-2'
                  : 'w-2 h-2 opacity-30 group-hover:opacity-50'
              }`}
              style={{ backgroundColor: i === current ? slide.accentColor : '#fff' }}
            />
          </button>
        ))}
      </View>

      {/* Swipe hint (not on last slide) */}
      {!isLast && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50"
        >
          <motion.p
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-white/20 text-[10px] tracking-[0.2em] uppercase flex items-center gap-2"
          >
            <ChevronLeft className="w-3 h-3" />
            Swipe to continue
            <ChevronRight className="w-3 h-3" />
          </motion.p>
        </motion.div>
      )}
    </View>,
    document.body
  );
};
