import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Plus, User, MessageSquareText } from 'lucide-react';
import { BugDrawer } from './BugDrawer';

export type ViewState = 'DISCOVER' | 'CREATE' | 'PROFILE';

const NAV_ITEMS = [
  { id: 'DISCOVER' as const, icon: Compass, label: 'Discover' },
  { id: 'CREATE' as const, icon: Plus, label: 'Create' },
  { id: 'PROFILE' as const, icon: User, label: 'Profile' },
];

interface FloatingNavProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export const FloatingNav = memo(({ currentView, onNavigate }: FloatingNavProps) => {
  const [isBugDrawerOpen, setIsBugDrawerOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false); 

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringRef = useRef(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const handleActivity = useCallback(() => {
    if (isDesktop) {
      setIsVisible(true);
      return;
    }
    setIsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (!isHoveringRef.current && !isBugDrawerOpen) {
      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 1500);
    }
  }, [isBugDrawerOpen, isDesktop]);

  useEffect(() => {
    if (isDesktop) return;
    const events = ['scroll', 'touchstart', 'click', 'keydown', 'mousemove'];
    events.forEach(event => window.addEventListener(event, handleActivity));
    handleActivity();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [handleActivity, isDesktop]);

  const handleMouseEnter = () => {
    isHoveringRef.current = true;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    isHoveringRef.current = false;
    if (!isDesktop) handleActivity();
  };

  const navItems = NAV_ITEMS;

  return (
    <>
      <motion.div
        initial={{ y: 0 }}
        animate={{ 
          y: isDesktop ? 0 : (isVisible ? 0 : 120),
          opacity: isDesktop ? 1 : (isVisible ? 1 : 0.5) 
        }} 
        transition={{ 
          type: "spring", damping: 20, stiffness: 300, mass: 0.8 
        }}
        // ▼▼▼ 修正: stickyをやめてfixedに戻し、背景色を追加 ▼▼▼
        className="fixed z-50 flex justify-center pointer-events-none px-4
        bottom-8 left-0 right-0 
        md:top-0 md:bottom-auto md:px-0 md:w-full 
        md:bg-[#0A0A0A]/90 md:backdrop-blur-xl md:border-b md:border-white/5" 
    >
        <div 
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleMouseEnter} 
          // ▼▼▼ 修正: PCでは幅最大(w-full)にし、背景は親に任せるため透明に ▼▼▼
          className={`
            pointer-events-auto relative flex items-center justify-between gap-6 
            transition-all duration-300
            
            /* Mobile Styles */
            bg-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 rounded-full pl-10 pr-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] min-w-[320px]
            
            /* Desktop Styles */
            md:w-full md:max-w-7xl md:mx-auto md:rounded-none md:border-none md:bg-transparent md:shadow-none md:py-4 md:px-8
          `}
        >
          
          {/* ▼▼▼ 修正: ロゴの中身を復活させました ▼▼▼ */}
          <div className="hidden md:flex items-center gap-2 font-bold text-xl text-white tracking-tight">
             
            
          </div>

          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-2 md:gap-8">
              {navItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id as ViewState)}
                    className="relative px-4 h-12 flex items-center justify-center rounded-full transition-all duration-300 group"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-active-bg"
                        className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <div className="relative z-10 flex items-center gap-2">
                      <item.icon 
                        className={`w-6 h-6 transition-colors duration-300 ${
                          isActive ? 'text-black fill-black/10' : 'text-white/40 group-hover:text-white'
                        }`} 
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      <span className={`hidden md:block text-sm font-medium ${
                         isActive ? 'text-black' : 'text-white/60 group-hover:text-white'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="w-px h-8 bg-white/10" />
            <button
              onClick={() => setIsBugDrawerOpen(true)}
              className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-orange-500/30 transition-all group"
            >
               <MessageSquareText 
                 className="w-4 h-4 text-orange-400/70 group-hover:text-orange-400 group-hover:scale-110 transition-all duration-500" 
               />
            </button>
          </div>
        </div>
      </motion.div>

      <BugDrawer 
        isOpen={isBugDrawerOpen} 
        onClose={() => setIsBugDrawerOpen(false)} 
      />
    </>
  );
});