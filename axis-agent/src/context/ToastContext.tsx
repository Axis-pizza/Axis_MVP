import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion'; // ✅ 必須
import { Toast } from '../components/common/Toast';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toast, setToast] = useState<{ message: string; type: ToastType; id: number } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToast({ message, type, id });

    // ✅ IDを使って正確に3秒後に消す（上書きされた時に前のタイマーが新しいのを消さないように）
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* ✅ 最前面(z-[9999])で AnimatePresence を発火させる */}
      <div className="fixed top-0 left-0 right-0 z-[10000] pointer-events-none flex justify-center pt-6">
        <AnimatePresence mode="wait">
          {toast && (
            <Toast
              key={toast.id} // keyが変わることでAnimatePresenceがリセットを検知
              message={toast.message}
              type={toast.type}
            />
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
