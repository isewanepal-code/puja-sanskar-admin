'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, type ReactNode } from 'react';

import { useToast } from '@/components/overlays';
import { isApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

// A price is rupees and paisa; a count may carry parts of a pack (0.5 kg).
const SHAPE = {
  money: /^\d+(\.\d{1,2})?$/,
  quantity: /^\d+(\.\d{1,3})?$/,
} as const;

type InlineNumberProps = {
  // What is shown while it is not being edited (the formatted price).
  display: ReactNode;
  // The plain number the box starts with.
  initial: string;
  type: keyof typeof SHAPE;
  label: string;
  // Saves it; the list is refreshed by the caller afterwards.
  onSave: (value: string) => Promise<unknown>;
  // Money is above zero; a count may be zero.
  allowZero?: boolean;
};

// A number changed straight in the list, Excel style: click, type, Enter (or leave the box) to save,
// Esc to give up. The new number shows at once and goes back if the API refuses.
export function InlineNumber({
  display,
  initial,
  type,
  label,
  onSave,
  allowZero = false,
}: InlineNumberProps) {
  const tt = useTranslations('table');
  const tf = useTranslations('forms');
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initial);
  const [shown, setShown] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // Leaving the box and pressing Enter must not save twice.
  const done = useRef(false);

  const begin = () => {
    done.current = false;
    setText(initial);
    setEditing(true);
  };
  const finish = async (save: boolean) => {
    if (done.current) return;
    done.current = true;
    setEditing(false);
    const next = text.trim();
    if (!save || next === initial.trim()) return;
    if (!SHAPE[type].test(next) || (!allowZero && Number(next) <= 0)) {
      toast.error(tt(type === 'money' ? 'badPrice' : 'badNumber'));
      return;
    }
    setBusy(true);
    setShown(next);
    try {
      await onSave(next);
      toast.success(tt('inlineSaved', { name: label }));
    } catch (error) {
      toast.error(isApiError(error) ? error.message : tf('failed'));
    } finally {
      setShown(null);
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={input}
        autoFocus
        inputMode="decimal"
        value={text}
        aria-label={label}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setText(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void finish(true);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            void finish(false);
          }
        }}
        onBlur={() => void finish(true)}
        className="h-8 w-24 rounded-md border border-primary bg-card px-2 text-right text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/25"
      />
    );
  }
  return (
    <button
      type="button"
      title={tt('inlineHint')}
      aria-label={`${label}: ${tt('inlineHint')}`}
      disabled={busy}
      onClick={(event) => {
        event.stopPropagation();
        begin();
      }}
      className={cn(
        '-mx-1.5 rounded px-1.5 py-0.5 text-right tabular-nums decoration-dotted underline-offset-4 hover:bg-muted hover:underline focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none',
        busy && 'opacity-60',
      )}
    >
      {shown !== null ? shown : display}
    </button>
  );
}
