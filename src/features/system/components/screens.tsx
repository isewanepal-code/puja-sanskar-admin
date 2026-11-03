'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useToast } from '@/components/overlays';
import { ResourceScreen, WorkbookUpload } from '@/components/resource';
import { Button, IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { isApiError, request, type Schema } from '@/lib/api';

import { activityResource, type ActivityEvent } from '../resources';

type Reindex = Schema<'ReindexResponse'>;

export function ActivityScreen() {
  const t = useTranslations('system');
  const [open, setOpen] = useState<ActivityEvent | null>(null);
  return (
    <>
      <ResourceScreen
        resource={activityResource}
        rowActions={(row) => (
          <IconButton icon="eye" label={t('details')} onClick={() => setOpen(row)} />
        )}
      />
      <Modal
        open={open !== null}
        onOpenChange={(next) => (next ? undefined : setOpen(null))}
        size="lg"
        title={open?.action ?? ''}
        description={open ? `${open.method} ${open.route}` : undefined}
      >
        {open ? (
          <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t('who')}</dt>
            <dd>{open.actor?.fullName ?? '—'}</dd>
            <dt className="text-muted-foreground">{t('what')}</dt>
            <dd>
              {open.entityType ?? '—'} {open.entityId ?? ''}
            </dd>
            <dt className="text-muted-foreground">{t('from')}</dt>
            <dd className="break-all">
              {open.ip ?? '—'} · {open.userAgent ?? '—'}
            </dd>
            <dt className="text-muted-foreground">{t('request')}</dt>
            <dd className="font-mono text-xs">{open.requestId}</dd>
            <dt className="text-muted-foreground">{t('detailsLabel')}</dt>
            <dd>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(open.details, null, 2)}
              </pre>
            </dd>
          </dl>
        ) : null}
      </Modal>
    </>
  );
}

// The master dataset upload, checked before it is imported, and the search index rebuilt on demand.
export function DataToolsScreen() {
  const t = useTranslations('system');
  const tf = useTranslations('forms');
  const toast = useToast();
  const reindex = useMutation({
    mutationFn: () => request<Reindex>('POST', '/admin/search/reindex'),
    onSuccess: (result) => toast.success(t('reindexed', { count: result.documents ?? 0 })),
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  return (
    <div className="grid max-w-3xl gap-10">
      <section className="grid gap-4">
        <div>
          <h2 className="font-semibold">{t('importTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('importNote')}</p>
        </div>
        <WorkbookUpload path="/admin/dataset/import" />
      </section>
      <section className="grid gap-3">
        <div>
          <h2 className="font-semibold">{t('searchTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('searchNote')}</p>
        </div>
        <div>
          <Button
            variant="secondary"
            icon="refresh"
            disabled={reindex.isPending}
            onClick={() => reindex.mutate()}
          >
            {reindex.isPending ? t('reindexing') : t('reindex')}
          </Button>
        </div>
      </section>
    </div>
  );
}
