import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

export const Toast = ({ message, type }: ToastProps) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-[#0C0A09] border-green-500/30',
    error: 'bg-[#0C0A09] border-red-500/30',
    info: 'bg-[#0C0A09] border-blue-500/30',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ 
          x: 0, 
          opacity: 1,
          // ★ここでシェイクアニメーション
          rotate: [0, -5, 5, -5, 5, 0],
          transition: { type: "spring", stiffness: 300, damping: 20 }
        }}
        exit={{ x: -100, opacity: 0 }}
        className={`fixed top-4 left-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border ${bgColors[type]} shadow-2xl backdrop-blur-md min-w-[300px]`}
      >
        {icons[type]}
        <span className="font-medium text-white text-sm">{message}</span>
      </motion.div>
    </AnimatePresence>
  );
};