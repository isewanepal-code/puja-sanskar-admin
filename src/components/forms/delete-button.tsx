'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/overlays';

type DeleteButtonProps = {
  name: string;
  disabled?: boolean;
  onDelete: () => void;
};

// Removing a record always asks first.
export function DeleteButton({ name, disabled, onDelete }: DeleteButtonProps) {
  const t = useTranslations('forms');
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost text-destructive"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {t('delete')}
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t('deleteTitle', { name })}
        description={t('deleteBody')}
        confirmLabel={t('delete')}
        onConfirm={() => {
          setOpen(false);
          onDelete();
        }}
      />
    </>
  );
}
