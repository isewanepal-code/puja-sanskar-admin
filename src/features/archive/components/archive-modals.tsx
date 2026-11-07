'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { Input, Switch } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { isApiError, request } from '@/lib/api';

export type ArchiveTarget = { kind: 'item' | 'kit'; id: string; name: string };

type Held = { id: string; code: string; nameEn: string; nameNe: string };

const path = (target: ArchiveTarget, action: 'archive' | 'restore') =>
  `/admin/archive/${target.kind === 'item' ? 'items' : 'kits'}/${target.id}/${action}`;

// Everything an archive or restore changes, redrawn: the lists, stock, the dashboard.
function useRefresh() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async () => {
    await Promise.all(
      ['products', 'kits', 'stock', 'archive', 'counter'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );
    router.refresh();
  };
}

function Held({ rows }: { rows: Held[] }) {
  return (
    <ul className="grid gap-1 rounded-lg bg-muted/60 p-3 text-sm">
      {rows.map((row) => (
        <li key={row.id}>
          <span className="font-medium">{row.nameNe}</span>{' '}
          <span className="text-xs text-muted-foreground">
            {row.nameEn} · {row.code}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Retires an item or a kit: out of every list and sale, kept whole.
export function ArchiveModal({
  target,
  onClose,
}: {
  target: ArchiveTarget | null;
  onClose: () => void;
}) {
  const t = useTranslations('archive');
  const tf = useTranslations('forms');
  const toast = useToast();
  const refresh = useRefresh();
  const [reason, setReason] = useState('');
  const [withKits, setWithKits] = useState(false);
  const [held, setHeld] = useState<Held[] | null>(null);

  const close = () => {
    setReason('');
    setWithKits(false);
    setHeld(null);
    onClose();
  };

  const archive = useMutation({
    mutationFn: () =>
      request('POST', path(target!, 'archive'), {
        body: { reason: reason.trim() || undefined, withKits },
      }),
    onSuccess: async () => {
      toast.success(t('archived', { name: target!.name }));
      await refresh();
      close();
    },
    onError: (error) => {
      // Live kits hold the item: show them and offer to archive them too.
      if (isApiError(error, 'ARCHIVE_ITEM_IN_KITS')) setHeld(error.details as Held[]);
      else toast.error(isApiError(error) ? error.message : tf('failed'));
    },
  });

  return (
    <Modal
      open={target !== null}
      onOpenChange={(open) => (open ? undefined : close())}
      size="md"
      title={t('archiveTitle', { name: target?.name ?? '' })}
      description={t(target?.kind === 'kit' ? 'archiveKitNote' : 'archiveItemNote')}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {tf('cancel')}
          </Button>
          <Button
            icon="archive"
            disabled={archive.isPending || (held !== null && !withKits)}
            onClick={() => archive.mutate()}
          >
            {held ? t('archiveWithKits') : t('archive')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">{t('reason')}</span>
          <Input
            value={reason}
            maxLength={300}
            placeholder={t('reasonHint')}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        {held ? (
          <div className="grid gap-2">
            <p role="alert" className="text-sm font-medium text-destructive">
              {t('heldByKits', { count: held.length })}
            </p>
            <Held rows={held} />
            <Switch
              label={t('archiveKitsToo')}
              checked={withKits}
              onChange={(event) => setWithKits(event.target.checked)}
            />
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">{t('safeNote')}</p>
      </div>
    </Modal>
  );
}

// Brings an item or kit back, on the website at once unless told to stay hidden.
export function RestoreModal({
  target,
  onClose,
}: {
  target: ArchiveTarget | null;
  onClose: () => void;
}) {
  const t = useTranslations('archive');
  const tf = useTranslations('forms');
  const toast = useToast();
  const refresh = useRefresh();
  const [show, setShow] = useState(true);
  const [withItems, setWithItems] = useState(true);
  const [needs, setNeeds] = useState<Held[] | null>(null);

  const close = () => {
    setShow(true);
    setWithItems(true);
    setNeeds(null);
    onClose();
  };

  const restore = useMutation({
    mutationFn: () => request('POST', path(target!, 'restore'), { body: { show, withItems } }),
    onSuccess: async () => {
      toast.success(t('restored', { name: target!.name }));
      await refresh();
      close();
    },
    onError: (error) => {
      if (isApiError(error, 'ARCHIVE_KIT_NEEDS_ITEMS')) setNeeds(error.details as Held[]);
      else toast.error(isApiError(error) ? error.message : tf('failed'));
    },
  });

  return (
    <Modal
      open={target !== null}
      onOpenChange={(open) => (open ? undefined : close())}
      size="md"
      title={t('restoreTitle', { name: target?.name ?? '' })}
      description={t(target?.kind === 'kit' ? 'restoreKitNote' : 'restoreItemNote')}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {tf('cancel')}
          </Button>
          <Button icon="refresh" disabled={restore.isPending} onClick={() => restore.mutate()}>
            {t('restore')}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Switch label={t('showNow')} checked={show} onChange={(e) => setShow(e.target.checked)} />
        {target?.kind === 'kit' ? (
          <Switch
            label={t('withItems')}
            checked={withItems}
            onChange={(e) => setWithItems(e.target.checked)}
          />
        ) : null}
        {needs ? (
          <div className="grid gap-2">
            <p role="alert" className="text-sm font-medium text-destructive">
              {t('needsItems', { count: needs.length })}
            </p>
            <Held rows={needs} />
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
