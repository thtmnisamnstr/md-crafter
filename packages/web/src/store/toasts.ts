import { StateCreator } from 'zustand';
import { Toast, AppState } from './types';
import { TOAST_DURATION } from '../constants';
import { generateId } from './utils';

export interface ToastsSlice {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const createToastsSlice: StateCreator<AppState, [], [], ToastsSlice> = (set, get) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = generateId();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    
    // Auto-remove after TOAST_DURATION
    setTimeout(() => {
      get().removeToast(id);
    }, TOAST_DURATION);
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
});

