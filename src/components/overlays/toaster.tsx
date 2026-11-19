'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';

type Tone = 'success' | 'error' | 'info';
// A button on the toast (Undo): pressed, the toast goes away.
export type ToastAction = { label: string; onClick: () => void };
type ToastOptions = { action?: ToastAction; durationMs?: number };
type Toast = { id: number; tone: Tone; message: ReactNode; action?: ToastAction };

export type Notify = {
  success: (message: ReactNode, options?: ToastOptions) => void;
  error: (message: ReactNode, options?: ToastOptions) => void;
  info: (message: ReactNode, options?: ToastOptions) => void;
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

  const dismiss = useCallback(
    (id: number) => setToasts((current) => current.filter((t) => t.id !== id)),
    [],
  );
  const show = useCallback(
    (tone: Tone, message: ReactNode, options?: ToastOptions) => {
      const id = Date.now() + Math.random();
      setToasts((current) =>
        [...current, { id, tone, message, action: options?.action }].slice(-VISIBLE),
      );
      setTimeout(() => dismiss(id), options?.durationMs ?? DURATION_MS[tone]);
    },
    [dismiss],
  );
  const notify = useMemo<Notify>(
    () => ({
      success: (message, options) => show('success', message, options),
      error: (message, options) => show('error', message, options),
      info: (message, options) => show('info', message, options),
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
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
                className="shrink-0 font-semibold text-primary hover:underline"
              >
                {toast.action.label}
              </button>
            ) : null}
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
