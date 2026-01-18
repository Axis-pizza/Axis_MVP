/**
 * DiscoverView - Wrapper with Swipe/List toggle
 * Default view is Swipe, can toggle to List
 */

import { useState, useEffect } from 'react';
import { SwipeDiscoverView } from './SwipeDiscoverView';
import { ListDiscoverView } from './ListDiscoverView';
import type { Strategy } from '../../types';

type ViewMode = 'swipe' | 'list';

const STORAGE_KEY = 'axis-discover-view-mode';



interface DiscoverViewProps {
  onStrategySelect: (strategy: Strategy) => void; // 型変更
}

export const DiscoverView = ({ onStrategySelect }: DiscoverViewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Load from localStorage with 'swipe' as default
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'list' ? 'list' : 'swipe') as ViewMode;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

  const toggleView = () => {
    setViewMode(prev => prev === 'swipe' ? 'list' : 'swipe');
  };

  if (viewMode === 'swipe') {
    // 修正: onStrategySelect を渡す
    return <SwipeDiscoverView onToggleView={toggleView} onStrategySelect={onStrategySelect} />;
  }

  // ListDiscoverViewにも同様に渡す必要があります（未実装なら一旦そのまま、エラーが出る場合はListDiscoverViewも修正が必要）
  return <ListDiscoverView onToggleView={toggleView} onStrategySelect={onStrategySelect} />;
};