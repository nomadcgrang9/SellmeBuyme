'use client';

import { useMemo } from 'react';
import { useToastStore } from '@/stores/toastStore';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  const items = useMemo(() => toasts, [toasts]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed top-6 right-6 z-[9999] flex w-full max-w-sm flex-col gap-2">
      {items.map((toast) => {
        const textColor = {
          success: 'text-gray-800',
          error: 'text-red-800',
          info: 'text-gray-800',
          warning: 'text-amber-800'
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-2.5 text-sm font-medium ${textColor} bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 transition-all animate-slide-in-right`}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
