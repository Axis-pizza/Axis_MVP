/**
 * Home - Kagemusha AI Strategy Factory
 * Main entry with floating navigation and tactical interface
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, LogOut } from 'lucide-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from './hooks/useWallet';
import { FloatingNav } from './components/common/FloatingNav';
import { KagemushaFlow } from './components/create';
import { DiscoverView } from './components/discover';

type View = 'DISCOVER' | 'CREATE' | 'PROFILE';

export default function Home() {
  const [view, setView] = useState<View>('CREATE');
  const { isConnected, shortAddress, disconnect, getBalance } = useWallet();
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
            className="pb-32 px-4 pt-8"
          >
            <ProfileView
              isConnected={isConnected}
              shortAddress={shortAddress}
              balance={balance}
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

// Profile View Component
interface ProfileViewProps {
  isConnected: boolean;
  shortAddress: string | null;
  balance: number | null;
  onDisconnect: () => void;
}

const ProfileView = ({ isConnected, shortAddress, balance, onDisconnect }: ProfileViewProps) => {
  const { setVisible } = useWalletModal();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mb-6 border border-orange-500/30"
        >
          <Wallet className="w-12 h-12 text-orange-400" />
        </motion.div>

        <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-white/50 text-sm mb-8 max-w-xs">
          Connect to Solana Devnet to create and manage your strategy pizzas
        </p>

        <button
          onClick={() => setVisible(true)}
          className="px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold rounded-2xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all"
        >
          Connect Wallet
        </button>

        <p className="text-xs text-white/30 mt-4">
          🔒 Your keys, your crypto
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Wallet Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-2xl mb-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
            <span className="text-2xl">🥷</span>
          </div>
          <div>
            <p className="text-xs text-white/50">Connected Wallet</p>
            <p className="font-mono font-bold text-lg">{shortAddress}</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
          <div>
            <p className="text-xs text-white/50">Balance</p>
            <p className="font-bold text-xl">
              {balance !== null ? `${balance.toFixed(4)} SOL` : '—'}
            </p>
          </div>
          <div className="px-2 py-1 bg-purple-500/20 rounded text-xs text-purple-400">
            Devnet
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3 mb-6"
      >
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
          <p className="text-2xl font-bold">0</p>
          <p className="text-xs text-white/50">Pizzas Created</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
          <p className="text-2xl font-bold">—</p>
          <p className="text-xs text-white/50">Total Value</p>
        </div>
      </motion.div>

      {/* No Pizzas Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 bg-white/5 rounded-2xl border border-dashed border-white/20 text-center"
      >
        <span className="text-4xl mb-4 block">🍕</span>
        <p className="text-white/50 text-sm mb-4">
          You haven't created any strategy pizzas yet
        </p>
        <p className="text-xs text-white/30">
          Create your first one from the Create tab!
        </p>
      </motion.div>

      {/* Disconnect Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={onDisconnect}
        className="w-full mt-6 py-3 flex items-center justify-center gap-2 text-red-400 hover:text-red-300 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Disconnect Wallet
      </motion.button>
    </div>
  );
};