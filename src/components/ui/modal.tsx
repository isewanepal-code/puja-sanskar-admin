'use client';

import { Dialog } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

import { Icon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MIN_W = 320;
const MIN_H = 220;

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

// Grips along the edges and corners; pulling one stretches the box.
const GRIPS: Record<Edge, string> = {
  n: 'inset-x-3 -top-1 h-2 cursor-ns-resize',
  s: 'inset-x-3 -bottom-1 h-2 cursor-ns-resize',
  e: 'inset-y-3 -right-1 w-2 cursor-ew-resize',
  w: 'inset-y-3 -left-1 w-2 cursor-ew-resize',
  ne: '-top-1 -right-1 size-4 cursor-nesw-resize',
  nw: '-top-1 -left-1 size-4 cursor-nwse-resize',
  se: '-right-1 -bottom-1 size-4 cursor-nwse-resize',
  sw: '-bottom-1 -left-1 size-4 cursor-nesw-resize',
};

// What a form inside the modal offers when work is about to be dropped: keep it as a draft, or let
// the draft go too.
export type DraftHandlers = { save: () => void; discard: () => void };
const DraftContext = createContext<((handlers: DraftHandlers | null) => void) | null>(null);

export function useModalDraft(handlers: DraftHandlers | null) {
  const register = useContext(DraftContext);
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });
  const present = handlers !== null;
  useEffect(() => {
    if (!present) return;
    register?.({ save: () => latest.current?.save(), discard: () => latest.current?.discard() });
    return () => register?.(null);
  }, [present, register]);
}

const WIDTH = {
  xs: 'max-w-sm',
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
} as const;

export type ModalSize = keyof typeof WIDTH;

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  size?: ModalSize;
  // Buttons pinned under a body that scrolls.
  footer?: ReactNode;
  // The caller holds work the modal cannot see (rows in a grid): treated as typed-in.
  dirty?: boolean;
  // False for a modal that keeps what is typed in it by itself (the notes): closing never asks.
  askBeforeClosing?: boolean;
  // Changed when the form inside starts over (saved, and another one begins): typed-in state clears.
  resetKey?: unknown;
  children: ReactNode;
};

// A form inside a modal tells it when it holds typed-in work (react-hook-form knows even when a
// dropdown was picked, which no input event says).
const DirtyContext = createContext<((dirty: boolean) => void) | null>(null);

export function useModalDirty(dirty: boolean) {
  const report = useContext(DirtyContext);
  useEffect(() => {
    report?.(dirty);
    return () => report?.(false);
  }, [dirty, report]);
}

// The header can be dragged, so what is behind the modal can be read; this much of it stays on screen.
const KEEP_VISIBLE = 96;

// Every create, edit and confirm in the admin opens here: same header, close button and footer.
//
// Typed-in work is not lost by accident: a click outside does nothing, and Esc or the x ask before
// discarding. The work goes only when Cancel is pressed, the discard is confirmed, or it is saved.
// The header drags the modal aside (double-click puts it back); while it is aside the page behind
// stays readable and selectable.
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  footer,
  dirty: held = false,
  askBeforeClosing = true,
  resetKey,
  children,
}: ModalProps) {
  const t = useTranslations('common');
  const body = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState(false);
  const [reported, setReported] = useState(false);
  const [asking, setAsking] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  // Dragged aside by its header (the page behind then stays usable), as against only resized.
  const [aside, setAside] = useState(false);
  // Its own size once stretched by an edge or made big; null is the size its kind has.
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [draftSaver, setDraftSaver] = useState<DraftHandlers | null>(null);
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const stretch = useRef<{
    edge: Edge;
    px: number;
    py: number;
    w: number;
    h: number;
    ox: number;
    oy: number;
  } | null>(null);
  const dirty = askBeforeClosing && (typed || reported || held);
  const moved = aside;
  const shifted = offset.x !== 0 || offset.y !== 0;

  // A closed modal starts clean next time (state follows the prop during render, not in an effect).
  const [wasKey, setWasKey] = useState(resetKey);
  if (resetKey !== wasKey) {
    setWasKey(resetKey);
    setTyped(false);
    setReported(false);
  }
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setTyped(false);
      setReported(false);
      setAsking(false);
      setOffset({ x: 0, y: 0 });
      setAside(false);
      setBox(null);
    }
  }

  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button, a, input, select, textarea')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { px: event.clientX, py: event.clientY, ox: offset.x, oy: offset.y };
  };
  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const start = drag.current;
    const box = popup.current?.getBoundingClientRect();
    if (!start || !box) return;
    // Where the modal would sit with no offset, so the limits do not depend on where it is now.
    const baseLeft = box.left - offset.x;
    const baseTop = box.top - offset.y;
    const x = start.ox + event.clientX - start.px;
    const y = start.oy + event.clientY - start.py;
    setAside(true);
    setOffset({
      x: Math.min(
        Math.max(x, KEEP_VISIBLE - box.width - baseLeft),
        window.innerWidth - KEEP_VISIBLE - baseLeft,
      ),
      y: Math.min(Math.max(y, -baseTop), window.innerHeight - 48 - baseTop),
    });
  };
  const endDrag = () => {
    drag.current = null;
  };
  const startStretch = (edge: Edge) => (event: ReactPointerEvent<HTMLElement>) => {
    const rect = popup.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    stretch.current = {
      edge,
      px: event.clientX,
      py: event.clientY,
      w: rect.width,
      h: rect.height,
      ox: offset.x,
      oy: offset.y,
    };
  };
  // The edge pulled moves; the opposite one stays where it was (the box is centred, so the
  // centre moves half as far).
  const moveStretch = (event: ReactPointerEvent<HTMLElement>) => {
    const s = stretch.current;
    if (!s) return;
    const dx = event.clientX - s.px;
    const dy = event.clientY - s.py;
    let w = s.w;
    let h = s.h;
    if (s.edge.includes('e')) w = s.w + dx;
    if (s.edge.includes('w')) w = s.w - dx;
    if (s.edge.includes('s')) h = s.h + dy;
    if (s.edge.includes('n')) h = s.h - dy;
    w = Math.min(Math.max(w, MIN_W), window.innerWidth - 16);
    h = Math.min(Math.max(h, MIN_H), window.innerHeight - 16);
    setBox({ w, h });
    setOffset({
      x: s.ox + (s.edge.includes('e') ? (w - s.w) / 2 : s.edge.includes('w') ? -(w - s.w) / 2 : 0),
      y: s.oy + (s.edge.includes('s') ? (h - s.h) / 2 : s.edge.includes('n') ? -(h - s.h) / 2 : 0),
    });
  };
  const endStretch = () => {
    stretch.current = null;
  };
  const resetSize = () => {
    setBox(null);
    setOffset({ x: 0, y: 0 });
    setAside(false);
  };
  const toggleBig = () => {
    if (box) return resetSize();
    setAside(false);
    setOffset({ x: 0, y: 0 });
    setBox({ w: window.innerWidth - 32, h: window.innerHeight - 32 });
  };
  // The cursor starts in the first field, not on the close button.
  const firstField = () =>
    body.current?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea') ?? true;
  return (
    <Dialog.Root
      open={open}
      // Aside, the page behind can be used; typed work is never dismissed by a click.
      modal={moved ? 'trap-focus' : true}
      disablePointerDismissal={dirty || moved}
      onOpenChange={(next, details) => {
        if (!next && dirty) {
          // Esc or the x with work typed in: ask first.
          details.cancel();
          setAsking(true);
          return;
        }
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop
          onPointerDown={() => {
            if (!dirty) return;
            setNudge(true);
            setTimeout(() => setNudge(false), 300);
          }}
          className={cn(
            'fixed inset-0 z-50 transition-[opacity,background-color] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
            moved ? 'pointer-events-none bg-black/10' : 'bg-black/40',
          )}
        />
        <Dialog.Popup
          ref={popup}
          initialFocus={firstField}
          style={{
            ...(shifted ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : {}),
            ...(box
              ? {
                  width: box.w,
                  height: box.h,
                  maxWidth: 'none',
                  maxHeight: 'calc(100dvh - 1rem)',
                }
              : {}),
          }}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-card shadow-xl transition-[opacity,scale] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            nudge && 'animate-[modal-nudge_300ms_ease-out]',
            moved && 'shadow-2xl ring-1 ring-border',
            WIDTH[size],
          )}
        >
          <header
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={(event) => {
              if (!(event.target as HTMLElement).closest('button')) resetSize();
            }}
            title={t('dragHint')}
            className="relative flex cursor-grab touch-none items-start justify-between gap-4 rounded-t-lg border-b border-border bg-muted/50 py-3.5 pr-4 pl-6 select-none before:absolute before:top-3.5 before:bottom-3.5 before:left-0 before:w-1 before:rounded-r-full before:bg-primary active:cursor-grabbing"
          >
            <div className="min-w-0">
              <Dialog.Title className="font-heading text-[1.05rem] leading-snug font-semibold">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label={box ? t('restoreSize') : t('maximize')}
                title={box ? t('restoreSize') : t('maximize')}
                onClick={toggleBig}
                className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              >
                <Icon name={box ? 'restore' : 'maximize'} size={16} />
              </button>
              <Dialog.Close
                aria-label={t('close')}
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              >
                <Icon name="x" size={18} />
              </Dialog.Close>
            </div>
          </header>
          <div
            ref={body}
            onInput={() => setTyped(true)}
            onKeyDown={(event) => {
              // Ctrl or Cmd + Enter saves without reaching for the button.
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                const save = popup.current?.querySelector<HTMLButtonElement>(
                  'footer button[type=submit]:not(:disabled)',
                );
                if (save) {
                  event.preventDefault();
                  save.click();
                }
              }
            }}
            className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
          >
            <DirtyContext.Provider value={setReported}>
              <DraftContext.Provider value={setDraftSaver}>{children}</DraftContext.Provider>
            </DirtyContext.Provider>
          </div>
          {footer ? (
            <footer className="flex items-center justify-end gap-2 rounded-b-lg border-t border-border bg-muted/40 px-6 py-3">
              {footer}
            </footer>
          ) : null}
          {(Object.keys(GRIPS) as Edge[]).map((edge) => (
            <span
              key={edge}
              aria-hidden="true"
              title={edge === 'se' ? t('resizeHint') : undefined}
              onPointerDown={startStretch(edge)}
              onPointerMove={moveStretch}
              onPointerUp={endStretch}
              onPointerCancel={endStretch}
              className={cn('absolute z-20 touch-none', GRIPS[edge])}
            />
          ))}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-1.5 bottom-1.5 z-20 size-2.5 rounded-br-sm border-r-2 border-b-2 border-muted-foreground/50"
          />
          {asking ? (
            <div
              role="alertdialog"
              aria-label={t('discardTitle')}
              className="absolute inset-0 z-10 grid place-items-center rounded-lg bg-card/90 p-6 backdrop-blur-[2px]"
            >
              <div className="grid w-full max-w-md gap-3 rounded-lg border border-border bg-card p-5 text-center shadow-lg">
                <p className="font-semibold">{t('discardTitle')}</p>
                <p className="text-sm text-muted-foreground">{t('discardBody')}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button autoFocus onClick={() => setAsking(false)}>
                    {t('keepEditing')}
                  </Button>
                  {draftSaver ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        draftSaver.save();
                        setAsking(false);
                        setTyped(false);
                        setReported(false);
                        onOpenChange(false);
                      }}
                    >
                      {t('leaveSaveDraft')}
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      draftSaver?.discard();
                      setAsking(false);
                      setTyped(false);
                      setReported(false);
                      onOpenChange(false);
                    }}
                  >
                    {t('discard')}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
