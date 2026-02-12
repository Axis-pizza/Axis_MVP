import { useState, useEffect } from 'react';
import { User, Layers } from 'lucide-react'; 
import { SwipeDiscoverView } from './SwipeDiscoverView';
import { ListDiscoverView } from './ListDiscoverView';
import { ProfileDrawer } from '../common/ProfileDrawer'; 
import type { Strategy } from '../../types';

type ViewMode = 'swipe' | 'list';

const STORAGE_KEY = 'axis-discover-view-mode';

interface DiscoverViewProps {
  onStrategySelect: (strategy: Strategy) => void;
  onOverlayChange?: (isActive: boolean) => void;
}

export const DiscoverView = ({ onStrategySelect, onOverlayChange }: DiscoverViewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'list' ? 'list' : 'swipe') as ViewMode;
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

  const toggleView = () => {
    setViewMode(prev => prev === 'swipe' ? 'list' : 'swipe');
  };

  return (
    <div className="relative min-h-screen bg-black">
      
      {/* --- ヘッダー部分 (修正) --- */}
      <div className="flex items-center justify-between w-full px-4 py-3 z-50 relative">

        {/* 右側：ボタン群 */}
        <div className="flex items-center gap-3">

          {/* プロフィールボタン */}
          <button
            onClick={() => {
              setIsDrawerOpen(true);
            }}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all relative"
          >
            <User className="w-5 h-5 text-[#E7E5E4]" />
            <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#D97706] rounded-full border-2 border-black" />
          </button>
        </div>
      </div>

      {/* --- メインコンテンツ --- */}
      <div className="relative">
        {viewMode === 'swipe' ? (
          <SwipeDiscoverView
            onToggleView={toggleView}
            onStrategySelect={onStrategySelect}
            onOverlayChange={onOverlayChange}
          />
        ) : (
          <ListDiscoverView 
            onToggleView={toggleView} 
            onStrategySelect={onStrategySelect} 
          />
        )}
      </div>

      {/* --- ドロワー本体 --- */}
      <ProfileDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />

    </div>
  );
};