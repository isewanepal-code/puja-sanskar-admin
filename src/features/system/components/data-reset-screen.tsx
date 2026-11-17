'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { InfoTip } from '@/components/ui/info-tip';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { isApiError, request, type Schema } from '@/lib/api';

type Preview = Schema<'DataResetPreviewResponse'>;

const KEEPS = ['staff', 'settings', 'website', 'pujas', 'media'] as const;

// Development only: clears every item, order and customer so the shop can be filled in afresh.
export function DataResetScreen() {
  const t = useTranslations('dataReset');
  const tf = useTranslations('forms');
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState(false);
  const [typed, setTyped] = useState('');
  const [pujas, setPujas] = useState(false);

  const preview = useQuery({
    queryKey: ['data-reset'],
    queryFn: () => request<Preview>('GET', '/admin/data-reset'),
  });
  const clear = useMutation({
    mutationFn: () =>
      request<Preview>('POST', '/admin/data-reset', {
        body: { confirm: 'DELETE', includePujas: pujas },
      }),
    onSuccess: async (done) => {
      const rows = done.counts.reduce((sum, count) => sum + count.rows, 0);
      toast.success(t('done', { rows }));
      setAsking(false);
      setTyped('');
      setPujas(false);
      // Nothing cached is true any more.
      queryClient.clear();
      router.refresh();
      await preview.refetch();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  const counts = preview.data?.counts ?? [];
  const total = counts.reduce((sum, count) => sum + count.rows, 0);
  const enabled = preview.data?.enabled === true;

  return (
    <div className="grid max-w-3xl gap-6">
      <section className="grid gap-3 rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          {t('removes')} <InfoTip text={t('removesHelp')} />
        </h2>
        <ul className="grid gap-1.5 text-sm">
          {counts.map((count) => (
            <li
              key={count.key}
              className="flex items-center justify-between gap-3 border-b border-border/60 py-1.5"
            >
              <span>
                {t(`groups.${count.key as 'catalogue'}`)}
                <span className="block text-xs text-muted-foreground">
                  {t(`groupNotes.${count.key as 'catalogue'}`)}
                </span>
              </span>
              <b className="tabular-nums">{count.rows}</b>
            </li>
          ))}
          {preview.isPending ? <li className="text-muted-foreground">…</li> : null}
        </ul>
      </section>

      <section className="grid gap-2 rounded-lg border border-border bg-muted/40 p-5">
        <h2 className="text-base font-semibold">{t('stays')}</h2>
        <ul className="list-disc pl-5 text-sm text-muted-foreground">
          {KEEPS.filter((key) => !(pujas && key === 'pujas')).map((key) => (
            <li key={key}>{t(`keeps.${key}`)}</li>
          ))}
        </ul>
      </section>

      <label className="flex items-start gap-2 rounded-lg border border-border bg-card p-4 text-sm">
        <input
          type="checkbox"
          checked={pujas}
          onChange={(event) => setPujas(event.target.checked)}
          className="mt-0.5 size-4"
        />
        <span>
          <b>{t('includePujas')}</b>
          <span className="block text-muted-foreground">{t('includePujasHelp')}</span>
        </span>
      </label>

      {preview.isSuccess && !enabled ? (
        <p role="status" className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          {t('off')}
        </p>
      ) : null}

      <div>
        <Button
          variant="danger"
          icon="trash"
          disabled={!enabled || total === 0}
          onClick={() => setAsking(true)}
        >
          {t('button')}
        </Button>
        {enabled && total === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('nothing')}</p>
        ) : null}
      </div>

      <Modal
        open={asking}
        onOpenChange={(open) => (open ? undefined : (setAsking(false), setTyped('')))}
        size="sm"
        title={t('confirmTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => (setAsking(false), setTyped(''))} autoFocus>
              {tf('cancel')}
            </Button>
            <Button
              variant="danger"
              icon="trash"
              disabled={typed !== 'DELETE' || clear.isPending}
              onClick={() => clear.mutate()}
            >
              {clear.isPending ? tf('saving') : t('confirmButton')}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 text-sm">
          <p>{t('confirmBody', { rows: total })}</p>
          <p className="font-medium text-destructive">{t('cannotUndo')}</p>
          <label className="grid gap-1.5">
            {t('typeToConfirm')}
            <Input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              aria-label={t('typeToConfirm')}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
