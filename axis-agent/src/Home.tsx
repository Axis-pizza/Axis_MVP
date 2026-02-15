/**
 * Home - Kagemusha AI Strategy Factory
 * Main entry with floating navigation and tactical interface
 */
import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useWallet, useConnection } from './hooks/useWallet';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { FloatingNav, type ViewState } from './components/common/FloatingNav';
import { TutorialOverlay } from './components/common/TutorialOverlay';
import { KagemushaFlow } from './components/create';
import { DiscoverView } from './components/discover/DiscoverView';
import { ProfileView } from './components/profile/ProfileView';
import { StrategyDetailView } from './components/discover/StrategyDetailView';
import type { Strategy } from './types';
import { getUsdcBalance } from './services/usdc';

type View = 'DISCOVER' | 'CREATE' | 'PROFILE' | 'STRATEGY_DETAIL';
const TUTORIAL_KEY = 'kagemusha-onboarding-v2';

export default function Home() {
  const [view, setView] = useState<View>('CREATE');
  const [previousView, setPreviousView] = useState<View>('DISCOVER');
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isOverlayActive, setIsOverlayActive] = useState(false);
  const [hideNavInCreate, setHideNavInCreate] = useState(false);

  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const [balance, setBalance] = useState<number | null>(null);

  // ウォレット残高の取得（USDC）
  const getBalance = useCallback(async () => {
    if (!publicKey || !connection) return 0;
    try {
      return await getUsdcBalance(connection, publicKey);
    } catch {
      return 0;
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected) {
      getBalance().then(setBalance);
    }
  }, [connected, getBalance]);

  // 初回訪問時にオンボーディングを表示（ウォレット接続不要）
  useEffect(() => {
    const isCompleted = localStorage.getItem(TUTORIAL_KEY);
    if (!isCompleted) {
      const timer = setTimeout(() => setShowTutorial(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleTutorialComplete = () => {
    localStorage.setItem(TUTORIAL_KEY, 'true');
    setShowTutorial(false);
  };

  const handleConnectWallet = () => {
    setWalletModalVisible(true);
  };

  const handleStrategySelect = (strategy: Strategy) => {
    setPreviousView(view);
    setSelectedStrategy(strategy);
    setView('STRATEGY_DETAIL');
  };

  const handleBackFromDetail = () => {
    setView(previousView);
    setSelectedStrategy(null);
  };

  const handleNavigate = (newView: ViewState) => {
    setView(newView as View);
  };

  return (
    <div className="bg-[#030303] min-h-screen text-white font-sans selection:bg-orange-500/30 relative overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-900/10 blur-[120px] rounded-full" />
      </div>

        {/* DISCOVER VIEW */}
        {view === 'DISCOVER' && (
          <div className="relative z-10 pb-32">
            <DiscoverView onStrategySelect={handleStrategySelect} onOverlayChange={setIsOverlayActive} />
          </div>
        )}

        {/* CREATE VIEW */}
        {view === 'CREATE' && (
          <div className="relative z-10 pb-32">
            <KagemushaFlow
              onStepChange={(step) => setHideNavInCreate(step !== 'LANDING' && step !== 'DASHBOARD')}
            />
          </div>
        )}

        {/* PROFILE VIEW */}
        {view === 'PROFILE' && (
          <div className="relative z-10 pb-32">
            <ProfileView onStrategySelect={handleStrategySelect} />
          </div>
        )}

        {/* STRATEGY DETAIL */}
        {view === 'STRATEGY_DETAIL' && selectedStrategy && (
          <div className="fixed inset-0 z-[200] bg-[#030303]">
            <StrategyDetailView
              initialData={selectedStrategy}
              onBack={handleBackFromDetail}
            />
          </div>
        )}

      {/* Floating Navigation (Tutorial targets this) */}
      {view !== 'STRATEGY_DETAIL' && !hideNavInCreate && !isOverlayActive && (
        <FloatingNav
          currentView={view as ViewState}
          onNavigate={handleNavigate}
        />
      )}

      {/* Luxury Tutorial Overlay */}
      <AnimatePresence>
        {showTutorial && (
          <TutorialOverlay onComplete={handleTutorialComplete} onConnectWallet={handleConnectWallet} />
        )}
      </AnimatePresence>
    </div>
  );
}