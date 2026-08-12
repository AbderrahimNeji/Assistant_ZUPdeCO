import { create } from "zustand";

export type ToastVariant = "success" | "error" | "default";

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastState = {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id"> & { id?: string }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

const dismissTimers = new Map<string, number>();

function clearDismissTimer(id: string) {
  const timerId = dismissTimers.get(id);
  if (timerId !== undefined) {
    window.clearTimeout(timerId);
    dismissTimers.delete(id);
  }
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push: (toast) => {
    const id = toast.id ?? `toast-${crypto.randomUUID()}`;
    clearDismissTimer(id);

    set((state) => ({
      toasts: [...state.toasts.filter((item) => item.id !== id), { ...toast, id }],
    }));

    const timerId = window.setTimeout(() => {
      dismissTimers.delete(id);
      set((state) => ({
        toasts: state.toasts.filter((item) => item.id !== id),
      }));
    }, 4200);

    dismissTimers.set(id, timerId);
    return id;
  },

  dismiss: (id) => {
    clearDismissTimer(id);
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  clear: () => {
    for (const id of dismissTimers.keys()) {
      clearDismissTimer(id);
    }
    set({ toasts: [] });
  },
}));

export function toast(input: Omit<ToastItem, "id"> & { id?: string }) {
  return useToastStore.getState().push(input);
}
