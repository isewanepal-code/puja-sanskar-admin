'use client';

import { AlertDialog } from '@base-ui/react/alert-dialog';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Icon } from '@/components/icons';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  // Removing something is red; anything else is the plain primary action.
  danger?: boolean;
  onConfirm: () => void;
};

// Asks before anything is removed; "keep it" has the focus.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  danger = true,
  onConfirm,
}: ConfirmDialogProps) {
  const t = useTranslations('common');
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <div className="confirm-dialog open">
          <AlertDialog.Backdrop className="cd-scrim" />
          <AlertDialog.Popup className="cd-box">
            <span className="cd-icon">
              <Icon name={danger ? 'trash' : 'info'} size={22} />
            </span>
            <AlertDialog.Title render={<h2 />}>{title}</AlertDialog.Title>
            {description ? (
              <AlertDialog.Description render={<p />}>{description}</AlertDialog.Description>
            ) : null}
            <div className="cd-actions">
              <AlertDialog.Close className="btn btn-outline">{t('keep')}</AlertDialog.Close>
              <button
                type="button"
                className={danger ? 'btn btn-danger' : 'btn btn-primary'}
                onClick={() => {
                  onConfirm();
                  onOpenChange(false);
                }}
              >
                {confirmLabel ?? t('remove')}
              </button>
            </div>
          </AlertDialog.Popup>
        </div>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
