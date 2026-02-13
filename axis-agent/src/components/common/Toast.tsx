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
    info: <Info className="w-5 h-5 text-[#B8863F]" />,
  };

  const bgColors = {
    success: 'bg-[#080503] border-green-500/30',
    error: 'bg-[#080503] border-red-500/30',
    info: 'bg-[#080503] border-[rgba(184,134,63,0.25)]',
  };

  const shakeIntensity = type === 'error' ? 15 : 4;
  const rotateIntensity = type === 'error' ? 6 : 2;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ 
          x: [0, -shakeIntensity, shakeIntensity, -shakeIntensity, shakeIntensity, -shakeIntensity, 0],
          rotate: [0, -rotateIntensity, rotateIntensity, -rotateIntensity, rotateIntensity, 0],
          opacity: 1,
        }}
        transition={{ 
          x: { duration: 0.4, times: [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1] },
          rotate: { duration: 0.4, times: [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1] },
          opacity: { duration: 0.2 }
        }}
        exit={{ x: -100, opacity: 0 }}
        className={`fixed top-4 left-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border ${bgColors[type]} shadow-2xl backdrop-blur-md min-w-[300px]`}
      >
        {icons[type]}
        <span className="font-medium text-[#F2E0C8] text-sm">{message}</span>
      </motion.div>
    </AnimatePresence>
  );
};