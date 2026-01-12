/**
 * Home - Kagemusha AI Strategy Factory
 * Main entry with floating navigation and tactical interface
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from './hooks/useWallet';
import { FloatingNav } from './components/common/FloatingNav';
import { KagemushaFlow } from './components/create';
import { DiscoverView } from './components/discover/DiscoverView';
import { ProfileView } from './components/profile/ProfileView';

type View = 'DISCOVER' | 'CREATE' | 'PROFILE';

export default function Home() {
  const [view, setView] = useState<View>('CREATE');
  const { isConnected, shortAddress, disconnect, getBalance, publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (isConnected) {
      getBalance().then(setBalance);
    }
  }, [isConnected, getBalance]);

  return (
    <div className="bg-[#030303] min-h-screen text-white font-sans selection:bg-orange-500/30 relative overflow-x-hidden">
      <AnimatePresence mode="wait">
        {/* Create View - Kagemusha Flow */}
        {view === 'CREATE' && (
          <motion.div
            key="create"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pb-32"
          >
            <KagemushaFlow />
          </motion.div>
        )}

        {/* Discover View - Rankings */}
        {view === 'DISCOVER' && (
          <motion.div
            key="discover"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="pb-32"
          >
            <DiscoverView />
          </motion.div>
        )}

        {/* Profile View */}
        {view === 'PROFILE' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pb-32"
          >
            <ProfileView
              isConnected={isConnected}
              shortAddress={shortAddress}
              balance={balance}
              publicKey={publicKey}
              onDisconnect={disconnect}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Navigation */}
      <FloatingNav currentView={view} onNavigate={setView} />
    </div>
  );
}