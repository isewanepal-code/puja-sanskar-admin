'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

type ConfirmDeleteProps = {
  name: string | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

// The one question asked before anything is removed; "cancel" is the safe default.
export function ConfirmDelete({ name, pending, onCancel, onConfirm }: ConfirmDeleteProps) {
  const t = useTranslations('forms');
  return (
    <Modal
      open={name !== null}
      onOpenChange={(open) => (open ? undefined : onCancel())}
      size="xs"
      title={t('deleteTitle', { name: name ?? '' })}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} autoFocus>
            {t('cancel')}
          </Button>
          <Button variant="danger" icon="trash" onClick={onConfirm} disabled={pending}>
            {t('delete')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">{t('deleteBody')}</p>
    </Modal>
  );
}
