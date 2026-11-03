'use client';

import { Dialog } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';
import { useRef, type ReactNode } from 'react';

import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';

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
  children: ReactNode;
};

// Every create, edit and confirm in the admin opens here: same header, close button and footer.
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  footer,
  children,
}: ModalProps) {
  const t = useTranslations('common');
  const body = useRef<HTMLDivElement>(null);
  // The cursor starts in the first field, not on the close button.
  const firstField = () =>
    body.current?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea') ?? true;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          initialFocus={firstField}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-card shadow-xl transition-all data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            WIDTH[size],
          )}
        >
          <header className="relative flex items-start justify-between gap-4 rounded-t-lg border-b border-border bg-muted/50 py-3.5 pr-4 pl-6 before:absolute before:top-3.5 before:bottom-3.5 before:left-0 before:w-1 before:rounded-r-full before:bg-primary">
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
            <Dialog.Close
              aria-label={t('close')}
              className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <Icon name="x" size={18} />
            </Dialog.Close>
          </header>
          <div ref={body} className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {children}
          </div>
          {footer ? (
            <footer className="flex items-center justify-end gap-2 rounded-b-lg border-t border-border bg-muted/40 px-6 py-3">
              {footer}
            </footer>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
