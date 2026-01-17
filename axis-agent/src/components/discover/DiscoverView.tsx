/**
 * DiscoverView - Wrapper with Swipe/List toggle
 * Default view is Swipe, can toggle to List
 */

import { useState, useEffect } from 'react';
import { SwipeDiscoverView } from './SwipeDiscoverView';
import { ListDiscoverView } from './ListDiscoverView';

type ViewMode = 'swipe' | 'list';

const STORAGE_KEY = 'axis-discover-view-mode';

export const DiscoverView = () => {
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
    return <SwipeDiscoverView onToggleView={toggleView} />;
  }

  return <ListDiscoverView onToggleView={toggleView} />;
};
