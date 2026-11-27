'use client';

import { useTranslations } from 'next-intl';
import { useId, useRef, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

import { ResourceForm } from './resource-form';
import { useResourceText } from './translate';
import type { Resource } from './types';

// The window that adds a record or edits one: its form, Cancel, Save (and "Save and add another" for a
// new record), and what belongs to a saved record below the form.
export function ResourceFormModal<T>({
  resource,
  editing,
  onClose,
  onCreated,
  editFooter,
}: {
  resource: Resource<T>;
  // null: closed; 'new': a blank form; a row: its form.
  editing: T | 'new' | null;
  onClose: () => void;
  onCreated?: (row: T) => void;
  editFooter?: (row: T) => ReactNode;
}) {
  const t = useResourceText(resource.key);
  const tf = useTranslations('forms');
  const formId = useId();
  const [saving, setSaving] = useState(false);
  // "Save and add another" keeps the modal and starts a blank form.
  const again = useRef(false);
  const [round, setRound] = useState(0);
  // The order is dragged, so the form has no number to type.
  const formResource = resource.reorder
    ? { ...resource, fields: resource.fields.filter((field) => field.name !== 'sortOrder') }
    : resource;

  return (
    <Modal
      open={editing !== null}
      onOpenChange={(open) => (open ? undefined : onClose())}
      size={resource.modalSize ?? 'md'}
      resetKey={round}
      title={
        editing === 'new' || editing === null
          ? t('add')
          : tf('editing', { name: resource.rowLabel(editing) })
      }
      description={
        t.has('aboutForm')
          ? t('aboutForm')
          : editing === 'new'
            ? tf('aboutCreate')
            : tf('aboutEdit')
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tf('cancel')}
          </Button>
          {editing === 'new' && !onCreated ? (
            <Button
              type="submit"
              form={formId}
              variant="secondary"
              disabled={saving}
              onClick={() => {
                again.current = true;
              }}
            >
              {tf('saveAndAdd')}
            </Button>
          ) : null}
          <Button
            type="submit"
            form={formId}
            disabled={saving}
            onClick={() => {
              again.current = false;
            }}
          >
            {saving ? tf('saving') : editing === 'new' ? tf('create') : tf('save')}
          </Button>
        </>
      }
    >
      {editing !== null ? (
        <ResourceForm
          key={editing === 'new' ? `new-${round}` : resource.rowId(editing)}
          resource={formResource}
          row={editing === 'new' ? undefined : editing}
          formId={formId}
          onPendingChange={setSaving}
          onDone={(saved) => {
            if (editing === 'new' && again.current) {
              // Saved; the same modal starts a blank form, with the cursor in the first box.
              again.current = false;
              setRound((n) => n + 1);
              setTimeout(
                () =>
                  document
                    .querySelector<HTMLElement>(
                      '[role=dialog] input:not([type=hidden]):not([disabled]), [role=dialog] textarea',
                    )
                    ?.focus(),
                80,
              );
              return;
            }
            if (editing === 'new' && saved) onCreated?.(saved as T);
            onClose();
          }}
        />
      ) : null}
      {editing !== null && editing !== 'new' ? editFooter?.(editing) : null}
    </Modal>
  );
}
