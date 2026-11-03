'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';

type Tone = 'success' | 'error' | 'info';
type Toast = { id: number; tone: Tone; message: ReactNode };

export type Notify = {
  success: (message: ReactNode) => void;
  error: (message: ReactNode) => void;
  info: (message: ReactNode) => void;
};

const ToastContext = createContext<Notify | null>(null);

const VISIBLE = 3;
// An error stays long enough to read twice.
const DURATION_MS: Record<Tone, number> = { success: 3000, info: 3500, error: 6000 };

const TONE: Record<Tone, { icon: 'check' | 'x' | 'info'; className: string }> = {
  success: { icon: 'check', className: 'text-success' },
  error: { icon: 'x', className: 'text-destructive' },
  info: { icon: 'info', className: 'text-primary' },
};

// Short confirmations and failures in the corner; at most three at a time.
export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((tone: Tone, message: ReactNode) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, tone, message }].slice(-VISIBLE));
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), DURATION_MS[tone]);
  }, []);
  const notify = useMemo<Notify>(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
      info: (message) => show('info', message),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        aria-live="polite"
        className="fixed right-4 bottom-4 z-[60] grid w-[min(380px,calc(100%-2rem))] gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className="flex items-start gap-2.5 rounded-md bg-card px-4 py-3 text-sm shadow-lg ring-1 ring-border"
          >
            <Icon
              name={TONE[toast.tone].icon}
              size={18}
              className={cn('mt-px shrink-0', TONE[toast.tone].className)}
            />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Notify {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error('useToast needs <Toaster> above it');
  return notify;
}
