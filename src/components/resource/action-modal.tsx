'use client';

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Modal, type ModalSize } from '@/components/ui/modal';

import { ResourceForm } from './resource-form';
import type { Resource } from './types';

type ActionModalProps<T> = {
  // The action as a resource: its path is where the form posts.
  resource: Resource<T> | null;
  title: string;
  description?: string;
  submitLabel: string;
  doneMessage: string;
  // What the form starts with: the list it is about to replace.
  defaults?: Record<string, unknown>;
  size?: ModalSize;
  onClose: () => void;
};

// A one-off action that needs a few fields (a new tax rate, a password reset), in the usual modal.
export function ActionModal<T>({
  resource,
  title,
  description,
  submitLabel,
  doneMessage,
  defaults,
  size = 'sm',
  onClose,
}: ActionModalProps<T>) {
  const tf = useTranslations('forms');
  const formId = useId();
  const [pending, setPending] = useState(false);

  return (
    <Modal
      open={resource !== null}
      onOpenChange={(open) => (open ? undefined : onClose())}
      size={size}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tf('cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={pending}>
            {pending ? tf('saving') : submitLabel}
          </Button>
        </>
      }
    >
      {resource ? (
        <ResourceForm
          resource={resource}
          formId={formId}
          defaults={defaults}
          successMessage={doneMessage}
          onPendingChange={setPending}
          onDone={onClose}
        />
      ) : null}
    </Modal>
  );
}
