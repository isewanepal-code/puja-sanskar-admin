'use client';

import { Dialog } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  // A wide modal has its own header, scrolling list and footer (m-head, m-foot).
  wide?: boolean;
  children: ReactNode;
};

export function Modal({ open, onOpenChange, title, wide = false, children }: ModalProps) {
  const t = useTranslations('common');
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <div className="modal open">
          <Dialog.Backdrop className="modal-scrim" />
          <Dialog.Popup className={cn('modal-box', wide && 'modal-wide')}>
            <Dialog.Close className="icon-btn x" aria-label={t('close')}>
              <Icon name="x" />
            </Dialog.Close>
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
            {children}
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
