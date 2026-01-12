/**
 * Floating Navigation Bar - Kagemusha Tactical Style
 * Glassmorphism + floating effect with pizza inspiration
 */

import { motion } from 'framer-motion';
import { Compass, Plus, User, Sparkles } from 'lucide-react';

interface FloatingNavProps {
  currentView: 'DISCOVER' | 'CREATE' | 'PROFILE';
  onNavigate: (view: 'DISCOVER' | 'CREATE' | 'PROFILE') => void;
}

export const FloatingNav = ({ currentView, onNavigate }: FloatingNavProps) => {
  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      {/* Outer glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-orange-500/20 blur-xl rounded-full" />
      
      {/* Main nav container */}
      <div className="relative flex items-center gap-2 px-3 py-2 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl">
        {/* Discover */}
        <NavButton
          icon={Compass}
          label="Discover"
          active={currentView === 'DISCOVER'}
          onClick={() => onNavigate('DISCOVER')}
        />

        {/* Create - Center Button (Pizza-inspired) */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onNavigate('CREATE')}
          className="relative -my-4"
        >
          {/* Rotating pizza-like ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className={`absolute inset-0 rounded-full border-2 border-dashed ${
              currentView === 'CREATE' ? 'border-orange-500/50' : 'border-white/20'
            }`}
            style={{ margin: -4 }}
          />
          
          <div className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
            currentView === 'CREATE'
              ? 'bg-gradient-to-br from-orange-500 to-amber-500 shadow-orange-500/30'
              : 'bg-gradient-to-br from-zinc-800 to-zinc-900 hover:from-orange-500/20 hover:to-amber-500/20'
          }`}>
            {currentView === 'CREATE' ? (
              <Sparkles className="w-6 h-6 text-black" />
            ) : (
              <Plus className="w-6 h-6 text-white" />
            )}
          </div>
          
          {/* Active indicator */}
          {currentView === 'CREATE' && (
            <motion.div
              layoutId="activeIndicator"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-orange-500 rounded-full"
            />
          )}
        </motion.button>

        {/* Profile */}
        <NavButton
          icon={User}
          label="Profile"
          active={currentView === 'PROFILE'}
          onClick={() => onNavigate('PROFILE')}
        />
      </div>
    </motion.nav>
  );
};

interface NavButtonProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavButton = ({ icon: Icon, label, active, onClick }: NavButtonProps) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all ${
      active ? 'text-orange-400' : 'text-white/40 hover:text-white/70'
    }`}
  >
    <div className={`p-2 rounded-xl transition-all ${active ? 'bg-orange-500/10' : ''}`}>
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-[10px] font-medium tracking-wide">{label}</span>
    
    {/* Active dot */}
    {active && (
      <motion.div
        layoutId="navDot"
        className="absolute -bottom-0 w-1 h-1 bg-orange-500 rounded-full"
      />
    )}
  </motion.button>
);
