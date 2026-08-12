import { toast as shadcnToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

// Enhanced toast with variants and branding colors
export const toast = {
  success: (message: string, options?: ToastOptions) => {
    return shadcnToast({
      description: (
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-[rgb(34,197,94)] flex-shrink-0" />
          <span>{message}</span>
        </div>
      ),
      duration: options?.duration || 3000,
      className: 'border-l-2 border-[rgb(34,197,94)]',
    });
  },

  error: (message: string, options?: ToastOptions) => {
    return shadcnToast({
      description: (
        <div className="flex items-center gap-3">
          <XCircle className="w-6 h-6 text-[rgb(239,68,68)] flex-shrink-0" />
          <span>{message}</span>
        </div>
      ),
      duration: options?.duration || 3000,
      className: 'border-l-2 border-[rgb(239,68,68)]',
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    return shadcnToast({
      description: (
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-[rgb(245,158,11)] flex-shrink-0" />
          <span>{message}</span>
        </div>
      ),
      duration: options?.duration || 3000,
      className: 'border-l-2 border-[rgb(245,158,11)]',
    });
  },

  info: (message: string, options?: ToastOptions) => {
    return shadcnToast({
      description: (
        <div className="flex items-center gap-3">
          <Info className="w-6 h-6 text-[var(--color-2-nuance-1)] flex-shrink-0" />
          <span>{message}</span>
        </div>
      ),
      duration: options?.duration || 3000,
      className: 'border-l-2 border-[var(--color-2-nuance-1)]',
    });
  },

  // Default toast (backward compatibility)
  default: (message: string, options?: ToastOptions) => {
    return shadcnToast({
      title: options?.title,
      description: message,
      duration: options?.duration || 3000,
    });
  },
};

// Re-export the shadcn toast for advanced usage
export { toast as shadcnToast } from '@/hooks/use-toast';
