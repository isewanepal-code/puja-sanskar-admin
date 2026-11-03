'use client';

import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { BsDatePicker } from '@/components/ui/bs-date-picker';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Input, Select } from '@/components/ui/input';
import { download, isApiError, request } from '@/lib/api';

export type Filter = 'range' | 'fiscalYear' | 'kind';
type Query = Record<string, string | undefined>;

type ReportScreenProps<D, R> = {
  path: string;
  filters: Filter[];
  // Reports that come a page at a time; the rest come whole.
  paged?: boolean;
  // Rows of the report and their key.
  rows: (data: D) => R[];
  rowKey: (row: R) => string;
  columns: Column<R>[];
  // Totals or anything else above the table.
  summary?: (data: D) => ReactNode;
  initialSort?: { key: string; direction: 'asc' | 'desc' };
  // Reports without an Excel copy.
  noExport?: boolean;
};

// One report: its filters, a summary, a sortable table and the same report as an Excel file.
export function ReportScreen<D, R>({
  path,
  filters,
  paged = false,
  rows,
  rowKey,
  columns,
  summary,
  initialSort,
  noExport = false,
}: ReportScreenProps<D, R>) {
  const t = useTranslations('reports');
  const tf = useTranslations('forms');
  const toast = useToast();
  const [draft, setDraft] = useState<Query>({ kind: 'DUE' });
  const [query, setQuery] = useState<Query>({ kind: 'DUE' });
  const asked: Query = Object.fromEntries(
    Object.entries(query).filter(
      ([key]) =>
        filters.includes(key as Filter) ||
        ((key === 'from' || key === 'to') && filters.includes('range')),
    ),
  );

  const report = useQuery({
    queryKey: ['reports', path, asked],
    queryFn: () => request<D>('GET', path, { query: { ...asked, ...(paged && { limit: 100 }) } }),
    placeholderData: keepPreviousData,
  });
  const exportFile = useMutation({
    mutationFn: () => download(`${path}/export`, asked),
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  return (
    <div className="grid gap-5">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(draft);
        }}
      >
        {filters.includes('range') ? (
          <>
            <label className="grid gap-1 text-sm">
              {t('from')}
              <div className="w-56">
                <BsDatePicker
                  value={draft.from ?? ''}
                  onChange={(value) => setDraft({ ...draft, from: value || undefined })}
                />
              </div>
            </label>
            <label className="grid gap-1 text-sm">
              {t('to')}
              <div className="w-56">
                <BsDatePicker
                  value={draft.to ?? ''}
                  onChange={(value) => setDraft({ ...draft, to: value || undefined })}
                />
              </div>
            </label>
          </>
        ) : null}
        {filters.includes('fiscalYear') ? (
          <label className="grid gap-1 text-sm">
            {t('fiscalYear')}
            <Input
              placeholder="2083/84"
              className="w-32"
              value={draft.fiscalYear ?? ''}
              onChange={(e) => setDraft({ ...draft, fiscalYear: e.target.value || undefined })}
            />
          </label>
        ) : null}
        {filters.includes('kind') ? (
          <label className="grid gap-1 text-sm">
            {t('kind')}
            <Select
              value={draft.kind}
              className="w-56"
              onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
            >
              <option value="DUE">{t('kinds.DUE')}</option>
              <option value="REFUND">{t('kinds.REFUND')}</option>
            </Select>
          </label>
        ) : null}
        <Button type="submit" variant="secondary">
          {t('show')}
        </Button>
        {noExport ? null : (
          <Button
            className="ml-auto"
            icon="download"
            disabled={exportFile.isPending}
            onClick={() => exportFile.mutate()}
          >
            {exportFile.isPending ? t('exporting') : t('export')}
          </Button>
        )}
      </form>

      {report.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {isApiError(report.error) ? report.error.message : tf('failed')}
        </p>
      ) : null}
      {report.data && summary ? summary(report.data) : null}
      <DataTable
        rows={report.data ? rows(report.data) : []}
        columns={columns}
        rowKey={rowKey}
        loading={report.isPending}
        initialSort={initialSort}
        empty={t('empty')}
      />
    </div>
  );
}

// One figure of a report's totals.
export function Figure({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <div className="rounded-lg bg-card px-4 py-3 ring-1 ring-border">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div
        className={`mt-1 font-heading text-xl font-semibold ${tone === 'danger' ? 'text-destructive' : ''}`}
      >
        {value}
      </div>
    </div>
  );
}
