import { motion } from 'framer-motion';
import { Search, Flame, Sparkles, Wallet,TrendingUp,
  BarChart3} from 'lucide-react';
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
    { id: 'your_tokens', label: 'Your tokens', icon: Wallet, disabled: !isWalletConnected },
    { id: 'trending', label: 'Trending', icon: Flame, disabled: false },
    { id: 'stock', label: 'Stock', icon: TrendingUp, disabled: false },         // Added
    { id: 'prediction', label: 'Prediction', icon: BarChart3, disabled: false }, // Added
    { id: 'meme', label: 'Meme', icon: Sparkles, disabled: false },
    { id: 'all', label: 'All tokens', icon: Search, disabled: false },
  ] as const;

  return (
    <div className="flex items-center gap-2 pb-2 overflow-x-auto no-scrollbar mask-linear-fade">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        
        return (
          <button
            key={tab.id}
            // disabledの場合はクリック無効にする
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={`
              relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0
              ${isActive ? 'text-black' : 'text-white/40 hover:text-white/60 bg-white/5'}
              ${tab.disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
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