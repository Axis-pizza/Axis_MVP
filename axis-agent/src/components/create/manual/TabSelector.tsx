import { motion } from 'framer-motion';
import { Search, Flame, Sparkles, Wallet, BarChart3 } from 'lucide-react';
import type { TabType } from './types';

interface TabSelectorProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isWalletConnected: boolean;
}

export const TabSelector = ({
  activeTab,
  setActiveTab,
  isWalletConnected
}: TabSelectorProps) => {
  const tabs = [
    { id: 'trending', label: 'Trending', icon: Flame },
    { id: 'meme', label: 'Meme', icon: Sparkles },
    { id: 'prediction', label: 'Prediction', icon: BarChart3 },
    { id: 'all', label: 'All tokens', icon: Search },
  ] as const;

  return (
    <div className="flex items-center gap-2 pb-2 overflow-x-auto no-scrollbar mask-linear-fade">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0
              ${isActive ? 'text-black' : 'text-white/40 hover:text-white/60 bg-white/5'}
              cursor-pointer active:scale-95
            `}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-amber-500 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon size={14} className={isActive ? "text-black" : ""} />
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};