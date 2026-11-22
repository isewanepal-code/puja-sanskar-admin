'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

import { ResourceForm } from './resource-form';
import { useResourceText } from './translate';
import type { Resource } from './types';

// The same form the resource's own screen uses, opened on top of another page: add a supplier or a
// brand without leaving the bill you are filling. What was made is handed back to the page.
export function CreateModal<T>({
  resource,
  open,
  onOpenChange,
  onCreated,
}: {
  resource: Resource<T>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (row: T) => void;
}) {
  const t = useResourceText(resource.key);
  const tf = useTranslations('forms');
  const formId = useId();
  const [saving, setSaving] = useState(false);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size={resource.modalSize ?? 'md'}
      title={t('add')}
      description={t.has('aboutForm') ? t('aboutForm') : tf('aboutCreate')}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {tf('cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={saving}>
            {saving ? tf('saving') : tf('create')}
          </Button>
        </>
      }
    >
      {open ? (
        <ResourceForm
          resource={resource}
          formId={formId}
          onPendingChange={setSaving}
          onDone={(saved) => {
            if (saved) onCreated(saved as T);
            onOpenChange(false);
          }}
        />
      ) : null}
    </Modal>
  );
}
