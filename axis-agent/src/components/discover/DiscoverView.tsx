import { useState, useEffect } from 'react';
import { User, Menu, X, BookOpen, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SwipeDiscoverView } from './SwipeDiscoverView';
import { ListDiscoverView } from './ListDiscoverView';
import { ProfileDrawer } from '../common/ProfileDrawer';
import type { Strategy } from '../../types';

const XLogo = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const GithubLogo = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

interface DiscoverViewProps {
  onStrategySelect: (strategy: Strategy) => void;
  onOverlayChange?: (isActive: boolean) => void;
  viewMode: 'swipe' | 'list';
  onViewModeChange: (mode: 'swipe' | 'list') => void;
}

export const DiscoverView = ({ onStrategySelect, onOverlayChange, viewMode, onViewModeChange }: DiscoverViewProps) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [focusedStrategyId, setFocusedStrategyId] = useState<string | null>(null);

  // list へ戻った時に focus をリセット
  useEffect(() => {
    if (viewMode === 'list') setFocusedStrategyId(null);
  }, [viewMode]);

  const toggleView = () => {
    onViewModeChange(viewMode === 'swipe' ? 'list' : 'swipe');
  };

  // List カードをタップ → Swipe の最前面カードとして表示
  const handleOpenInSwipe = (strategyId: string) => {
    setFocusedStrategyId(strategyId);
    onViewModeChange('swipe');
  };

  const navigate = useNavigate();

  const menuLinks = [
    { label: 'Docs', icon: BookOpen, url: 'https://muse-7.gitbook.io/axis/product-docs/' },
    { label: 'X', icon: XLogo, url: 'https://x.com/axis_pizza' },
    { label: 'GitHub', icon: GithubLogo, url: 'https://github.com/Axis-pizza/Axis_MVP' },
    { label: 'Terms', icon: FileText, url: '/terms', isInternal: true },
  ];

  return (
    <div className="relative min-h-screen bg-[#080503]">
      {/* Header — right side buttons only (toggle は FloatingNav PC バーに統合済み) */}
      <div className="flex items-center justify-end w-full px-4 py-3 z-50 absolute top-0 md:top-16 left-0 right-0 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Menu button */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
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
            <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#B8863F] rounded-full border-2 border-[#080503]" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {viewMode === 'swipe' ? (
            <motion.div
              key="swipe"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
            >
              <SwipeDiscoverView
                onToggleView={toggleView}
                onStrategySelect={onStrategySelect}
                onOverlayChange={onOverlayChange}
                focusedStrategyId={focusedStrategyId}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
            >
              <ListDiscoverView
                onToggleView={toggleView}
                onStrategySelect={onStrategySelect}
                onOpenInSwipe={handleOpenInSwipe}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ProfileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
};
