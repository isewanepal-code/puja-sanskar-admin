'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { useToast } from '@/components/overlays';
import { ResourceScreen } from '@/components/resource';
import { Button, IconButton } from '@/components/ui/button';
import { Switch } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { isApiError, request, toApiError, type Schema } from '@/lib/api';

import { activityResource, type ActivityEvent } from '../resources';

type ImportReport = Schema<'ImportReportResponse'>;
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

// The master dataset upload, checked first with a dry run, and the search index rebuilt on demand.
export function DataToolsScreen() {
  const t = useTranslations('system');
  const tf = useTranslations('forms');
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [report, setReport] = useState<ImportReport | null>(null);
  const fail = (error: unknown) => toast.error(isApiError(error) ? error.message : tf('failed'));

  const importFile = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      body.append('file', file!);
      const response = await fetch(`/api/proxy/api/v1/admin/dataset/import?dryRun=${dryRun}`, {
        method: 'POST',
        credentials: 'same-origin',
        body,
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw toApiError(response.status, payload);
      return (payload as { data: ImportReport }).data;
    },
    onSuccess: (result) => {
      setReport(result);
      toast.success(result.dryRun ? t('checked') : t('imported'));
    },
    onError: fail,
  });
  const reindex = useMutation({
    mutationFn: () => request<Reindex>('POST', '/admin/search/reindex'),
    onSuccess: (result) => toast.success(t('reindexed', { count: result.documents ?? 0 })),
    onError: fail,
  });

  return (
    <div className="grid max-w-3xl gap-10">
      <section className="grid gap-4">
        <div>
          <h2 className="font-semibold">{t('importTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('importNote')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={input}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setReport(null);
            }}
          />
          <Button variant="secondary" icon="upload" onClick={() => input.current?.click()}>
            {file ? file.name : t('chooseFile')}
          </Button>
          <Switch
            label={t('dryRun')}
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
          />
          <Button disabled={!file || importFile.isPending} onClick={() => importFile.mutate()}>
            {importFile.isPending ? tf('saving') : dryRun ? t('check') : t('import')}
          </Button>
        </div>
        {report ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                <th className="py-2 font-medium">{t('sheet')}</th>
                <th className="py-2 text-right font-medium">{t('created')}</th>
                <th className="py-2 text-right font-medium">{t('updated')}</th>
                <th className="py-2 text-right font-medium">{t('unchanged')}</th>
                <th className="py-2 text-right font-medium">{t('skipped')}</th>
              </tr>
            </thead>
            <tbody>
              {report.sheets.map((sheet) => (
                <tr key={sheet.sheet} className="border-b border-border/60">
                  <td className="py-2">{sheet.sheet}</td>
                  <td className="py-2 text-right">{sheet.created}</td>
                  <td className="py-2 text-right">{sheet.updated}</td>
                  <td className="py-2 text-right">{sheet.unchanged}</td>
                  <td className="py-2 text-right">{sheet.skipped.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
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
