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
import { StrategyDetailView } from './components/discover/StrategyDetailView';
import type { Strategy } from './types'; // 型をインポート

type View = 'DISCOVER' | 'CREATE' | 'PROFILE' | 'STRATEGY_DETAIL';

export default function Home() {
  const [view, setView] = useState<View>('CREATE');
  
  // ★変更: IDではなくオブジェクト全体を保存
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  const { isConnected, shortAddress, disconnect, getBalance, publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (isConnected) {
      getBalance().then(setBalance);
    }
  }, [isConnected, getBalance]);

  // ★変更: オブジェクトを受け取る関数
  const handleStrategySelect = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setView('STRATEGY_DETAIL');
  };

  const handleBackFromDetail = () => {
    setView('DISCOVER');
    setSelectedStrategy(null);
  };

  return (
    <div className="bg-[#030303] min-h-screen text-white font-sans selection:bg-orange-500/30 relative overflow-x-hidden">
      <AnimatePresence mode="wait">
        {view === 'CREATE' && (
          <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-32">
            <KagemushaFlow />
          </motion.div>
        )}

        {view === 'DISCOVER' && (
          <motion.div key="discover" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="pb-32">
            {/* オブジェクトを渡す関数をPropsにする */}
            <DiscoverView onStrategySelect={handleStrategySelect} />
          </motion.div>
        )}

        {view === 'PROFILE' && (
          <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="pb-32">
            <ProfileView isConnected={isConnected} shortAddress={shortAddress} balance={balance} publicKey={publicKey} onDisconnect={disconnect} />
          </motion.div>
        )}

        {/* 詳細画面: ここで初期データを渡す */}
        {view === 'STRATEGY_DETAIL' && selectedStrategy && (
          <motion.div key="strategy-detail" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }} className="absolute inset-0 z-50 bg-[#0C0A09]">
            <StrategyDetailView 
              initialData={selectedStrategy} // ★IDだけでなくデータを渡す
              onBack={handleBackFromDetail} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {view !== 'STRATEGY_DETAIL' && (
        <FloatingNav currentView={view} onNavigate={setView} />
      )}
    </div>
  );
}