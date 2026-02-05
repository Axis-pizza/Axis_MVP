import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const STEPS = [
  {
    target: 'Create', // FloatingNav内にあるテキスト
    title: 'Forge Your Strategy',
    description: 'Leverage AI to construct institutional-grade on-chain portfolios in seconds.',
    duration: 5000
  },
  {
    target: 'Discover',
    title: 'Market Intelligence',
    description: 'Explore and copy high-performing strategies from the global community.',
    duration: 5000
  },
  {
    target: 'Profile',
    title: 'Tactical Portfolio',
    description: 'Monitor your assets and track your ranking in the ecosystem rewards program.',
    duration: 5000
  }
];

export const TutorialOverlay = ({ onComplete }: { onComplete: () => void }) => {
  const [current, setCurrent] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const findAndSetTarget = useCallback(() => {
    const step = STEPS[current];
    // DOMからテキストを検索（大文字小文字無視）
    const elements = Array.from(document.querySelectorAll('button, span, a, p'));
    const targetEl = elements.find(el => 
      el.textContent?.trim().toLowerCase() === step.target.toLowerCase()
    );

    if (targetEl) {
      setRect(targetEl.getBoundingClientRect());
    } else {
      // 見つからない場合は中央付近を指す（フォールバック）
      setRect(null);
    }
  }, [current]);

  useEffect(() => {
    // 画面遷移やリサイズに対応
    const timer = setTimeout(findAndSetTarget, 300);
    window.addEventListener('resize', findAndSetTarget);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', findAndSetTarget);
    };
  }, [current, findAndSetTarget]);

  // 自動進行
  useEffect(() => {
    const timer = setTimeout(() => {
      if (current < STEPS.length - 1) {
        setCurrent(prev => prev + 1);
      } else {
        onComplete();
      }
    }, STEPS[current].duration);
    return () => clearTimeout(timer);
  }, [current, onComplete]);

  const step = STEPS[current];

  return createPortal(
    <div className="fixed inset-0 z-[1000000] pointer-events-none">
      {/* ラグジュアリーなSVGオーバーレイ 
        maskを使ってスポットライト部分をソフトに切り抜く
      */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto">
        <defs>
          <mask id="spotlightMask">
            <rect width="100%" height="100%" fill="white" />
            <motion.circle
              initial={false}
              animate={{
                cx: rect ? rect.left + rect.width / 2 : '50%',
                cy: rect ? rect.top + rect.height / 2 : '50%',
                r: rect ? Math.max(rect.width, rect.height) * 0.8 : 0,
              }}
              transition={{ type: 'spring', stiffness: 40, damping: 20 }}
              fill="black"
              style={{ filter: 'blur(10px)' }} // スポットライトの縁をぼかす
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(3,3,3,0.9)" mask="url(#spotlightMask)" />
      </svg>

      {/* 説明コンテンツ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center"
        >
          {/* テキストの位置をスポットライトに応じて調整 */}
          <div className={`max-w-xs ${rect && rect.top < 400 ? 'mt-64' : '-mt-64'}`}>
            <span className="text-orange-500 text-[10px] tracking-[0.3em] uppercase mb-4 block font-medium">
              Intelligence Briefing {current + 1}/{STEPS.length}
            </span>
            <h2 className="text-3xl font-serif text-white mb-4 tracking-tight">
              {step.title}
            </h2>
            <p className="text-white/50 text-sm leading-relaxed font-light italic">
              "{step.description}"
            </p>

            {/* 進捗を示す細いライン */}
            <div className="mt-8 w-24 h-[1px] bg-white/10 mx-auto relative overflow-hidden">
              <motion.div
                key={`bar-${current}`}
                className="absolute inset-0 bg-orange-500"
                initial={{ x: '-100%' }}
                animate={{ x: '0%' }}
                transition={{ duration: step.duration / 1000, ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* スキップボタン */}
      <button
        onClick={onComplete}
        className="absolute top-12 right-10 text-white/20 hover:text-white transition-colors text-[10px] tracking-[0.2em] uppercase pointer-events-auto"
      >
        Dismiss System Guide
      </button>
    </div>,
    document.body
  );
};