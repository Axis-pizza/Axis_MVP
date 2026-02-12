import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Compass, Plus, Rocket, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface TutorialOverlayProps {
  onComplete: () => void;
  onConnectWallet: () => void;
}

const SLIDES = [
  {
    badge: 'Welcome to Axis',
    title: 'Shadow Strategy',
    subtitle: 'Institutional-grade DeFi portfolios, powered by AI. Built on Solana.',
    icon: Shield,
    accentColor: '#D97706', // Amber
  },
  {
    badge: 'Discover',
    title: 'Scout Elite Alpha',
    subtitle: 'Swipe through community-built portfolios. Copy the best performers with one tap.',
    icon: Compass,
    accentColor: '#F59E0B', // Orange
  },
  {
    badge: 'Create',
    title: 'Forge Your ETF',
    subtitle: 'Select tokens, set allocations, and deploy an on-chain index fund in seconds.',
    icon: Plus,
    accentColor: '#EA580C', // Burnt Orange
  },
  {
    badge: 'Get Started',
    title: 'Enter the Market',
    subtitle: 'The shadow market awaits. Dive in now to explore strategies.',
    icon: Rocket,
    accentColor: '#D97706',
  },
] as const;

const SWIPE_THRESHOLD = 50;

// Variants adjusted for the "Orb" container effect
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '50%' : '-50%',
    opacity: 0,
    scale: 0.8,
    rotateY: direction > 0 ? 45 : -45,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    rotateY: 0,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-50%' : '50%',
    opacity: 0,
    scale: 0.8,
    rotateY: direction > 0 ? -45 : 45,
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev();
      else if (e.key === 'Escape') onComplete();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, onComplete]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -SWIPE_THRESHOLD) goNext();
    else if (info.offset.x > SWIPE_THRESHOLD) goPrev();
  };

  const handleConnect = () => {
    onConnectWallet(); // Connect
    // We don't close immediately to let them see the connection UI, 
    // or you could call onComplete() here too depending on UX preference.
    onComplete(); 
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000000] bg-[#0C0A09] text-white overflow-hidden font-sans perspective-[1000px]">
      
      {/* 1. Improved Background: Darker overlay to help text pop */}
      <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none" />

      {/* Dynamic Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div
          key={`glow-${current}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.4, scale: 1 }} // Increased opacity slightly
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px]"
          style={{ backgroundColor: slide.accentColor }}
        />
      </div>

      {/* Prominent Skip Button (Top Right) */}
      <button
        onClick={onComplete}
        className="absolute top-8 right-8 z-50 group flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all"
      >
        <span className="text-xs font-medium tracking-wider text-white/60 group-hover:text-white uppercase">Skip Intro</span>
        <X className="w-3 h-3 text-white/40 group-hover:text-white" />
      </button>

      {/* Main Content Area */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 flex items-center justify-center p-6 cursor-grab active:cursor-grabbing z-10"
        >
          {/* THE LARGE ORB CONTAINER 
            This addresses "Center text in circle" and "Readability".
            The text sits inside this dark glass lens.
          */}
          <div className="relative w-full max-w-[380px] aspect-square rounded-full flex flex-col items-center justify-center text-center p-12 shadow-2xl">
            
            {/* Glass Background of the Orb */}
            <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]" />
            
            {/* Inner Ring Decoration */}
            <div className="absolute inset-4 rounded-full border border-white/5 pointer-events-none" />

            {/* Content Container (Relative to sit above glass) */}
            <div className="relative z-10 flex flex-col items-center">
              
              {/* Animated Icon */}
              <motion.div 
                initial={{ scale: 0.8, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6 relative"
              >
                <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" style={{ color: slide.accentColor }} />
                <Icon 
                  className="w-10 h-10 relative drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                  style={{ color: slide.accentColor }} 
                  strokeWidth={2}
                />
              </motion.div>

              {/* Text Content - Higher Contrast */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span
                  className="block text-[10px] font-bold tracking-[0.3em] uppercase mb-3"
                  style={{ color: slide.accentColor }}
                >
                  {slide.badge}
                </span>
                
                <h2 className="text-3xl font-serif text-white mb-4 tracking-tight leading-none">
                  {slide.title}
                </h2>
                
                <p className="text-zinc-400 text-sm leading-relaxed font-light mx-auto max-w-[260px]">
                  {slide.subtitle}
                </p>
              </motion.div>

              {/* Action Buttons (Only on Last Slide) */}
              {isLast && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8 flex flex-col gap-3 w-full max-w-[220px]"
                >
                  {/* Primary Action: Just Enter (Low Friction) */}
                  <button
                    onClick={onComplete}
                    className="w-full py-3 rounded-full font-bold text-xs tracking-wide text-black transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_-5px_rgba(217,119,6,0.5)]"
                    style={{ backgroundColor: '#D97706' }}
                  >
                    Enter Shadow Market
                  </button>

                  {/* Secondary Action: Connect (Optional) */}
                  <button
                    onClick={handleConnect}
                    className="w-full py-2 rounded-full font-medium text-xs tracking-wide text-zinc-500 hover:text-white transition-colors"
                  >
                    Connect Wallet
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Indicators */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-4 z-50">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setDirection(i > current ? 1 : -1);
              setCurrent(i);
            }}
            className="group py-2" // Larger hit area
          >
            <div
              className={`rounded-full transition-all duration-500 ease-out border ${
                i === current
                  ? 'w-3 h-3 bg-transparent border-white scale-110'
                  : 'w-1.5 h-1.5 bg-white/20 border-transparent group-hover:bg-white/40'
              }`}
              style={{ 
                borderColor: i === current ? slide.accentColor : undefined,
                backgroundColor: i === current ? slide.accentColor : undefined 
              }}
            />
          </button>
        ))}
      </div>

      {/* Navigation Hints (Arrows) */}
      {!isLast && (
        <>
          <button 
            onClick={goPrev} 
            disabled={current === 0}
            className={`absolute left-4 top-1/2 -translate-y-1/2 p-4 text-white/20 hover:text-white/60 transition-colors ${current === 0 ? 'opacity-0' : 'opacity-100'}`}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button 
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-4 text-white/20 hover:text-white/60 transition-colors"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}
    </div>,
    document.body
  );
};