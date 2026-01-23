import { useState, useEffect } from 'react';
import { User, Layers } from 'lucide-react'; 
import { SwipeDiscoverView } from './SwipeDiscoverView';
import { ListDiscoverView } from './ListDiscoverView';
import { ProfileDrawer } from '../common/ProfileDrawer'; // ★これがインポートされているか確認
import type { Strategy } from '../../types';

type ViewMode = 'swipe' | 'list';

const STORAGE_KEY = 'axis-discover-view-mode';

interface DiscoverViewProps {
  onStrategySelect: (strategy: Strategy) => void;
}

export const DiscoverView = ({ onStrategySelect }: DiscoverViewProps) => {
  // 1. 表示モードの管理
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'list' ? 'list' : 'swipe') as ViewMode;
  });

  // 2. ★ドロワーの開閉状態を管理するState (これがないと動きません)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

  const toggleView = () => {
    setViewMode(prev => prev === 'swipe' ? 'list' : 'swipe');
  };

  return (
    <div className="relative min-h-screen bg-black">
      
      {/* --- ヘッダー部分 --- */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/5 px-4 h-16 flex items-center justify-between safe-area-top">
        {/* ロゴ */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#D97706] rounded-lg flex items-center justify-center font-bold text-black font-serif">
            A
          </div>
          <h1 className="text-xl font-bold font-serif tracking-tight text-[#E7E5E4]">Axis</h1>
        </div>

        {/* 右側のボタン群 */}
        <div className="flex gap-2">
          {/* 表示切り替えボタン */}
          <button 
            onClick={toggleView}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-[#78716C] hover:text-white"
          >
            <Layers className="w-5 h-5" />
          </button>

          {/* ★プロフィールボタン (クリックで setIsDrawerOpen(true) が発動) */}
          <button 
            onClick={() => {
              console.log("Drawer Button Clicked!"); // デバッグ用ログ
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
          />
        ) : (
          <ListDiscoverView 
            onToggleView={toggleView} 
            onStrategySelect={onStrategySelect} 
          />
        )}
      </div>

      {/* --- ★ドロワー本体 (ここに配置されていないと表示されません) --- */}
      <ProfileDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />

    </div>
  );
};