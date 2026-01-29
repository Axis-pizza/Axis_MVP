/**
 * Home - Kagemusha AI Strategy Factory
 * Main entry with floating navigation and tactical interface
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from './hooks/useWallet';
import { FloatingNav, type ViewState } from './components/common/FloatingNav';
import { KagemushaFlow } from './components/create';
import { DiscoverView } from './components/discover/DiscoverView';
import { ProfileView } from './components/profile/ProfileView';
import { StrategyDetailView } from './components/discover/StrategyDetailView';
import type { Strategy } from './types';

// 'SWAP' を削除
type View = 'DISCOVER' | 'CREATE' | 'PROFILE' | 'STRATEGY_DETAIL';

export default function Home() {
  const [view, setView] = useState<View>('CREATE');
  
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  const { isConnected, getBalance } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (isConnected) {
      getBalance().then(setBalance);
    }
  }, [isConnected, getBalance]);

  const handleStrategySelect = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setView('STRATEGY_DETAIL');
  };

  const handleBackFromDetail = () => {
    setView('DISCOVER');
    setSelectedStrategy(null);
  };

  const handleNavigate = (newView: ViewState) => {
    setView(newView);
  };

  return (
    <div className="bg-[#030303] min-h-screen text-white font-sans selection:bg-orange-500/30 relative overflow-x-hidden">
      <AnimatePresence mode="wait">
        
        {/* 1. DISCOVER */}
        {view === 'DISCOVER' && (
          <motion.div key="discover" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="pb-32">
            <DiscoverView onStrategySelect={handleStrategySelect} />
          </motion.div>
        )}

        {/* 2. CREATE */}
        {view === 'CREATE' && (
          <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-32">
            <KagemushaFlow />
          </motion.div>
        )}

        {/* 3. PROFILE */}
        {view === 'PROFILE' && (
          <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="pb-32">
            <ProfileView />
          </motion.div>
        )}

        {/* 4. DETAIL */}
        {view === 'STRATEGY_DETAIL' && selectedStrategy && (
          <motion.div key="strategy-detail" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }} className="absolute inset-0 z-50 bg-[#0C0A09]">
            <StrategyDetailView 
              initialData={selectedStrategy}
              onBack={handleBackFromDetail} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      {view !== 'STRATEGY_DETAIL' && (
        <FloatingNav 
          currentView={view as ViewState} 
          onNavigate={handleNavigate} 
        />
      )}
    </div>
  );
}