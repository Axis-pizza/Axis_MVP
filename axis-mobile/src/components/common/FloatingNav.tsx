import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Compass, Plus, User, MessageSquareText } from 'lucide-react';
import { BugDrawer } from './BugDrawer';

export type ViewState = 'DISCOVER' | 'CREATE' | 'PROFILE';

interface FloatingNavProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export const FloatingNav = ({ currentView, onNavigate }: FloatingNavProps) => {
  const [isBugDrawerOpen, setIsBugDrawerOpen] = useState(false);
  
  // 表示制御用のState
  const [isVisible, setIsVisible] = useState(true);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringRef = useRef(false);

  // 操作があった時に呼ばれる関数
  const handleActivity = useCallback(() => {
    setIsVisible(true);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    // ナビを触っていない場合、1.5秒後に隠す
    if (!isHoveringRef.current && !isBugDrawerOpen) {
      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 1500); // ★修正: 3000ms(3秒) -> 1500ms(1.5秒) に短縮
    }
  }, [isBugDrawerOpen]);

  // イベントリスナーの設定
  useEffect(() => {
    // ★微調整: mousemove を外すと「意図してマウスを動かした時」以外で出なくなり、より消えやすくなります
    // 必要であれば 'mousemove' を配列に戻してください
    const events = ['scroll', 'touchstart', 'click', 'keydown', 'mousemove'];
    
    events.forEach(event => window.addEventListener(event, handleActivity));
    handleActivity();

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [handleActivity]);

  const handleMouseEnter = () => {
    isHoveringRef.current = true;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    isHoveringRef.current = false;
    handleActivity();
  };

  const navItems = [
    { id: 'DISCOVER', icon: Compass, label: 'Discover' },
    { id: 'CREATE', icon: Plus, label: 'Create' },
    { id: 'PROFILE', icon: User, label: 'Profile' },
  ];

  return (
    <>
      <motion.div
        initial={{ y: 0 }}
        animate={{ 
          y: isVisible ? 0 : 120,
          opacity: isVisible ? 1 : 0.5 
        }} 
        transition={{ 
          type: "spring", 
          damping: 20, 
          stiffness: 300,
          mass: 0.8 
        }}
        className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
      >
        <View 
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleMouseEnter} 
          className="pointer-events-auto relative flex items-center justify-between gap-6 bg-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 rounded-full pl-10 pr-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] min-w-[320px]"
        >
          
          <View className="flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onPress={() => onNavigate(item.id as ViewState)}
                  className="relative w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 group"
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-bg"
                      className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <View className="relative z-10">
                    <item.icon 
                      className={`w-6 h-6 transition-colors duration-300 ${
                        isActive ? 'text-black fill-black/10' : 'text-white/40 group-hover:text-white'
                      }`} 
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </View>
                </button>
              );
            })}
          </View>

          <View className="w-px h-8 bg-white/10" />

          <button
            onPress={() => setIsBugDrawerOpen(true)}
            className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-orange-500/30 transition-all group"
          >
             <MessageSquareText 
               className="w-4 h-4 text-orange-400/70 group-hover:text-orange-400 group-hover:scale-110 transition-all duration-500" 
             />
          </button>
        </View>
      </motion.div>

      <BugDrawer 
        isOpen={isBugDrawerOpen} 
        onClose={() => setIsBugDrawerOpen(false)} 
      />
    </>
  );
};