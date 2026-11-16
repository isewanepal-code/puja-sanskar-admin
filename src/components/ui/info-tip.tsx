'use client';

import { useId, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

// A small "i" that explains what a field or a screen is for. It opens on hover or focus, and on
// a tap on a phone, so nothing has to be learned by trying.
export function InfoTip({
  text,
  label = 'Info',
  align = 'left',
  className,
}: {
  text: ReactNode;
  label?: string;
  align?: 'left' | 'right';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className={cn('relative inline-flex align-middle', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(event) => {
          event.preventDefault();
          setOpen((was) => !was);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="grid size-4 place-items-center rounded-full border border-border text-[10px] leading-none font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:border-primary focus-visible:text-primary"
      >
        i
      </button>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className={cn(
            'absolute top-full z-[60] mt-1.5 w-64 max-w-[80vw] rounded-md border border-border bg-card p-2.5 text-xs leading-relaxed font-normal whitespace-pre-line text-foreground shadow-lg',
            align === 'left' ? 'left-0' : 'right-0',
          )}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
