'use client';

import { Dialog } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Icon } from '@/components/icons';

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

// Slides in from the right, like the cart.
export function Drawer({ open, onOpenChange, title, children, footer }: DrawerProps) {
  const t = useTranslations('common');
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="scrim open" />
        <Dialog.Popup className="drawer open">
          <div className="drawer-head">
            <Dialog.Title className="drawer-title">{title}</Dialog.Title>
            <Dialog.Close className="icon-btn" aria-label={t('close')}>
              <Icon name="x" />
            </Dialog.Close>
          </div>
          <div className="drawer-body">{children}</div>
          {footer ? <div className="drawer-foot">{footer}</div> : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
