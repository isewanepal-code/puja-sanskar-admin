'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { Schema } from '@/lib/api';

export type Usage = Schema<'UsageResponse'>;

type ConfirmDeleteProps = {
  name: string | null;
  // Where it is used, once known; undefined while it is being looked up, null when not asked.
  usage?: Usage | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

// The one question asked before anything is removed; "cancel" is the safe default.
export function ConfirmDelete({ name, usage, pending, onCancel, onConfirm }: ConfirmDeleteProps) {
  const t = useTranslations('forms');
  const tu = useTranslations('usage');
  const blocked = usage ? !usage.canDelete : false;
  const checking = usage === undefined;
  const blocking = usage?.lines.filter((line) => line.blocks) ?? [];
  const goesWith = usage?.lines.filter((line) => !line.blocks) ?? [];
  const text = (lines: Usage['lines']) =>
    lines
      .map(
        (line) =>
          `${tu(`kinds.${line.kind}`, { count: line.count })}${line.names.length ? ` (${line.names.join(', ')})` : ''}`,
      )
      .join(' · ');
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
          <Button
            variant="danger"
            icon="trash"
            onClick={onConfirm}
            disabled={pending || checking || blocked}
          >
            {t('delete')}
          </Button>
        </>
      }
    >
      {blocked ? (
        <div className="grid gap-2 text-sm">
          <p className="font-medium text-destructive">{tu('blocked')}</p>
          <p>{text(blocking)}</p>
          <p className="text-muted-foreground">{tu('blockedHint')}</p>
        </div>
      ) : (
        <div className="grid gap-2 text-sm">
          <p className="text-muted-foreground">{t('deleteBody')}</p>
          {checking ? <p className="text-muted-foreground">{tu('checking')}</p> : null}
          {goesWith.length > 0 ? (
            <p>
              <span className="font-medium">{tu('goesWith')} </span>
              {text(goesWith)}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
