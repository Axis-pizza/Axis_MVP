import { useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, Plus, User, MessageSquareText } from 'lucide-react';
import { BugDrawer } from './BugDrawer'; // 上で作ったコンポーネント

export type ViewState = 'DISCOVER' | 'CREATE' | 'PROFILE';

interface FloatingNavProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export const FloatingNav = ({ currentView, onNavigate }: FloatingNavProps) => {
  // Drawerの開閉状態
  const [isBugDrawerOpen, setIsBugDrawerOpen] = useState(false);

  const navItems = [
    { id: 'DISCOVER', icon: Compass, label: 'Discover' },
    { id: 'CREATE', icon: Plus, label: 'Create' },
    { id: 'PROFILE', icon: User, label: 'Profile' },
  ];

  return (
    <>
      <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        {/* Container */}
        <div className="pointer-events-auto relative flex items-center justify-between gap-6 bg-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 rounded-full pl-10 pr-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] min-w-[320px]">
          
          {/* Main Navigation Items */}
          <div className="flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id as ViewState)}
                  className="relative w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 group"
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-bg"
                      className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div className="relative z-10">
                    <item.icon 
                      className={`w-6 h-6 transition-colors duration-300 ${
                        isActive ? 'text-black fill-black/10' : 'text-white/40 group-hover:text-white'
                      }`} 
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-white/10" />

          {/* Bug Report Button (The "Magic" Button) */}
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

      {/* Drawer Component Integration */}
      <BugDrawer 
        isOpen={isBugDrawerOpen} 
        onClose={() => setIsBugDrawerOpen(false)} 
      />
    </>
  );
};