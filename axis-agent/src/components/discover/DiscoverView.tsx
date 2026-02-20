import { useState, useEffect } from 'react';
import { User, Menu, X, BookOpen, FileText, Github, Layers, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SwipeDiscoverView } from './SwipeDiscoverView';
import { ListDiscoverView } from './ListDiscoverView';
import { ProfileDrawer } from '../common/ProfileDrawer';
import type { Strategy } from '../../types';

// X (formerly Twitter) logo SVG component
const XLogo = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

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
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Menu open/close state

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

  const toggleView = () => {
    setViewMode((prev) => (prev === 'swipe' ? 'list' : 'swipe'));
  };

  const navigate = useNavigate();

  // Menu link definitions
  const menuLinks = [
    { label: 'Docs', icon: BookOpen, url: 'https://muse-7.gitbook.io/axis/product-docs/' },
    { label: 'X', icon: XLogo, url: 'https://x.com/axis_pizza' },
    { label: 'GitHub', icon: Github, url: 'https://github.com/Axis-pizza/Axis_MVP' },
    { label: 'Terms', icon: FileText, url: '/terms', isInternal: true },
  ];

  return (
    <div className="relative min-h-screen bg-[#080503]">
      {/* Header */}
      <div className="flex items-center w-full px-4 py-3 z-50 absolute top-0 md:top-16 left-0 right-0 pointer-events-none">
        {/* pointer-events-none prevents blocking swipe gestures; buttons use pointer-events-auto */}

        {/* Left: spacer to balance right buttons */}
        <div className="flex-1" />

        {/* Center: View Mode Toggle */}
        <div className="pointer-events-auto">
          <div className="flex items-center bg-black/50 backdrop-blur-md border border-white/10 rounded-full p-1 gap-0.5">
            <button
              onClick={() => viewMode !== 'swipe' && toggleView()}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === 'swipe'
                  ? 'bg-white/15 text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Layers size={13} />
              <span className="hidden sm:inline">Swipe</span>
            </button>
            <button
              onClick={() => viewMode !== 'list' && toggleView()}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-white/15 text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>

        {/* Right side: button group */}
        <div className="flex-1 flex justify-end items-center gap-3 pointer-events-auto">
          {/* Menu button (Docs, etc.) */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Dropdown menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <>
                  {/* Invisible overlay to close menu on background click */}
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />

                  {/* Menu body */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-48 bg-gradient-to-b from-[#140E08] to-[#080503] border border-[rgba(184,134,63,0.15)] rounded-2xl shadow-2xl z-50 overflow-hidden py-1"
                  >
                    {menuLinks.map((link) => {
                      const IconComponent = link.icon;
                      if ('isInternal' in link && link.isInternal) {
                        return (
                          <button
                            key={link.label}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors w-full text-left"
                            onClick={() => {
                              setIsMenuOpen(false);
                              navigate(link.url);
                            }}
                          >
                            <IconComponent size={16} />
                            {link.label}
                          </button>
                        );
                      }
                      return (
                        <a
                          key={link.label}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <IconComponent size={16} />
                          {link.label}
                        </a>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Profile button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/10 active:scale-95 transition-all relative group"
          >
            <User className="w-5 h-5 text-[#F2E0C8] group-hover:text-[#F2E0C8] transition-colors" />
            {/* Notification badge */}
            <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#B8863F] rounded-full border-2 border-[#080503]" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative">
        {viewMode === 'swipe' ? (
          <SwipeDiscoverView
            onToggleView={toggleView}
            onStrategySelect={onStrategySelect}
            onOverlayChange={onOverlayChange}
          />
        ) : (
          <ListDiscoverView onToggleView={toggleView} onStrategySelect={onStrategySelect} />
        )}
      </div>

      {/* Profile drawer */}
      <ProfileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
};
