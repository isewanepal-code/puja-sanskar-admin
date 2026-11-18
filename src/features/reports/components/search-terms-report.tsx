'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { request, type Schema } from '@/lib/api';

type Term = Schema<'SearchTermResponse'>;

const day = (iso: string) => iso.slice(0, 10);

// What shoppers typed in the website's search box, most searched first. The ones that found nothing
// are the words to add as "Other names" on an item, category, kit or puja.
export function SearchTermsReport() {
  const t = useTranslations('reports.searches');
  const [missing, setMissing] = useState(true);
  const list = useQuery({
    queryKey: ['reports', 'search-terms', missing],
    queryFn: () =>
      request<Term[]>('GET', '/admin/search/terms', { query: { missing, limit: 100 } }),
  });
  const rows = list.data ?? [];

  return (
    <div className="grid grid-cols-1 gap-4">
      <p className="max-w-3xl text-sm text-muted-foreground">{t('note')}</p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4"
          checked={missing}
          onChange={(event) => setMissing(event.target.checked)}
        />
        {t('onlyMissing')}
      </label>
      {list.isPending ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{missing ? t('noneMissing') : t('none')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[620px] border-separate border-spacing-0 text-sm">
            <thead className="bg-muted text-xs whitespace-nowrap text-muted-foreground">
              <tr>
                <th className="sticky left-0 z-10 border-b border-border bg-muted px-3 py-2 text-left font-medium">
                  {t('term')}
                </th>
                <th className="border-b border-border px-3 py-2 text-right font-medium">
                  {t('searches')}
                </th>
                <th className="border-b border-border px-3 py-2 text-right font-medium">
                  {t('foundNothing')}
                </th>
                <th className="border-b border-border px-3 py-2 text-right font-medium">
                  {t('lastFound')}
                </th>
                <th className="border-b border-border px-3 py-2 text-left font-medium">
                  {t('lastAt')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.term}>
                  <td className="sticky left-0 z-[5] border-b border-border bg-card px-3 py-2 font-medium whitespace-nowrap">
                    {row.display}
                  </td>
                  <td className="border-b border-border px-3 py-2 text-right tabular-nums">
                    {row.searches}
                  </td>
                  <td
                    className={`border-b border-border px-3 py-2 text-right tabular-nums ${row.noResultSearches > 0 ? 'text-destructive' : ''}`}
                  >
                    {row.noResultSearches}
                  </td>
                  <td className="border-b border-border px-3 py-2 text-right tabular-nums">
                    {row.lastResults}
                  </td>
                  <td className="border-b border-border px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {day(row.lastAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
