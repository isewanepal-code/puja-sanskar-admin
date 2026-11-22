'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

const WIDTH = 256;
const GAP = 6;
const EDGE = 8;

type Place = { top?: number; bottom?: number; left: number; width: number };

// A small "i" that explains what a field or a screen is for. It opens on hover or focus, and on
// a tap on a phone, so nothing has to be learned by trying.
//
// The text is drawn on top of the page, at the "i", kept inside the screen: it never sits in the
// modal's own scrolling box, so it cannot make that box scroll sideways.
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
  const [place, setPlace] = useState<Place | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  const show = useCallback(() => {
    const rect = button.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(WIDTH, window.innerWidth - EDGE * 2);
    const wanted = align === 'left' ? rect.left : rect.right - width;
    const left = Math.min(Math.max(wanted, EDGE), window.innerWidth - width - EDGE);
    // Below the "i"; above it when there is little room below.
    const below = rect.bottom + GAP + 120 <= window.innerHeight || rect.top < 140;
    setPlace(
      below
        ? { top: rect.bottom + GAP, left, width }
        : { bottom: window.innerHeight - rect.top + GAP, left, width },
    );
  }, [align]);
  const hide = useCallback(() => setPlace(null), []);

  // Wherever the page moves, the text would be left behind: it closes instead.
  useEffect(() => {
    if (!place) return;
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [place, hide]);

  const open = place !== null;
  return (
    <span
      className={cn('inline-flex align-middle', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(event) => {
          event.preventDefault();
          if (open) hide();
          else show();
        }}
        onFocus={show}
        onBlur={hide}
        className="grid size-4 place-items-center rounded-full border border-border text-[10px] leading-none font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:border-primary focus-visible:text-primary"
      >
        i
      </button>
      {place
        ? createPortal(
            <span
              role="tooltip"
              id={id}
              style={{
                position: 'fixed',
                top: place.top,
                bottom: place.bottom,
                left: place.left,
                width: place.width,
              }}
              className="pointer-events-none z-[70] rounded-md border border-border bg-card p-2.5 text-xs leading-relaxed font-normal whitespace-pre-line text-foreground shadow-lg"
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
