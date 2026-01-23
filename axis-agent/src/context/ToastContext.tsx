import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from '../components/common/Toast';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toast, setToast] = useState<{ message: string; type: ToastType; id: number } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type, id: Date.now() });
    
    // 3秒後に消す
    setTimeout(() => {
      setToast((current) => (current && current.message === message ? null : current));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* ここにToastコンポーネントを配置 */}
      {toast && <Toast message={toast.message} type={toast.type} key={toast.id} />}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};