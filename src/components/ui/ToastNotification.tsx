import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

export interface ToastData {
  id: string;
  message: string;
  type?: 'success' | 'danger' | 'info' | 'warning';
}

interface ToastNotificationProps {
  toasts: ToastData[];
  removeToast: (id: string) => void;
}

export const ToastNotification = ({ toasts, removeToast }: ToastNotificationProps) => {
  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastItem = ({ toast, removeToast }: { toast: ToastData, removeToast: (id: string) => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`px-5 py-2.5 rounded-full shadow-lg font-bold text-sm backdrop-blur-md border ${
        toast.type === 'success' ? 'bg-green-100/90 text-green-700 border-green-300' :
        toast.type === 'danger' ? 'bg-red-100/90 text-red-700 border-red-300' :
        toast.type === 'warning' ? 'bg-yellow-100/90 text-yellow-700 border-yellow-300' :
        toast.type === 'info' ? 'bg-purple-100/90 text-purple-700 border-purple-300' :
        'bg-white/90 text-slate-700 border-slate-200'
      }`}
    >
      {toast.message}
    </motion.div>
  );
};
