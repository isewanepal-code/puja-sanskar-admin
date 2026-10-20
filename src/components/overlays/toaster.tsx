'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { Icon } from '@/components/icons';

type Toast = { id: number; message: ReactNode; action?: ReactNode };
type ShowToast = (message: ReactNode, action?: ReactNode) => void;

const ToastContext = createContext<ShowToast | null>(null);

const VISIBLE = 2;
const DURATION_MS = 3200;

// Short confirmations at the bottom of the screen; at most two at a time.
export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback<ShowToast>((message, action) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, action }].slice(-VISIBLE));
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), DURATION_MS);
  }, []);
  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <Icon name="check" size={18} />
            <span className="toast-text">{toast.message}</span>
            {toast.action}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast needs <Toaster> above it');
  return show;
}
