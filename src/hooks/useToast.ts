import { create } from 'zustand';

export interface ToastData {
  id: string;
  message: string;
  type?: 'success' | 'danger' | 'info' | 'warning';
}

interface ToastStore {
  toasts: ToastData[];
  addToast: (message: string, type?: ToastData['type']) => void;
  removeToast: (id: string) => void;
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
