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
    <div className="pointer-events-none fixed top-6 right-6 z-[9999] flex w-full max-w-sm flex-col gap-3">
      {items.map((toast) => {
        const baseStyle =
          'pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm text-sm font-medium transition-all';

        const tone = {
          success: 'border-emerald-200 bg-emerald-50/95 text-emerald-800',
          error: 'border-red-200 bg-red-50/95 text-red-800',
          info: 'border-slate-200 bg-white/95 text-slate-800',
          warning: 'border-amber-200 bg-amber-50/95 text-amber-800'
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`${baseStyle} ${tone}`}
            role="status"
            aria-live="polite"
          >
            <span className="flex-1 leading-relaxed">{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
            >
              닫기
            </button>
          </div>
        );
      })}
    </div>
  );
}
