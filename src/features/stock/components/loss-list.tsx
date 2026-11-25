'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { request } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';

type Loss = {
  id: string;
  productNameNe: string;
  productNameEn: string;
  packLabel: string;
  quantity: number;
  unitCost: string | null;
  value: string;
  note: string | null;
  createdAt: string;
};
type Page = { items: Loss[]; meta: { page: number; totalPages: number; total: number } };

// Everything written off at this branch (damaged, expired, lost, spilled), newest first, with what it cost.
export function LossList() {
  const t = useTranslations('losses');
  const locale = useLocale() as 'en' | 'ne';
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ['stock', 'losses', page],
    queryFn: () => request<Page>('GET', `/admin/stock-losses?page=${page}&limit=25`),
  });
  const rows = list.data?.items ?? [];
  const total = rows.reduce((sum, r) => sum + Number(r.value), 0);
  const pages = list.data?.meta.totalPages ?? 1;

  return (
    <section className="grid gap-3 rounded-xl border border-border bg-card p-5">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{list.isPending ? '…' : t('none')}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t('count', { count: list.data?.meta.total ?? rows.length })} ·{' '}
            {t('pageValue', { amount: formatMoney(total.toFixed(2), 'en') })}
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted text-xs whitespace-nowrap text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t('date')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('item')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('size')}</th>
                  <th className="px-3 py-2 text-right font-medium">{t('qty')}</th>
                  <th className="px-3 py-2 text-right font-medium">{t('value')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('why')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDate(r.createdAt, locale)}
                    </td>
                    <td className="px-3 py-2">
                      <div>{r.productNameNe}</div>
                      <div className="text-xs text-muted-foreground">{r.productNameEn}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.packLabel}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(r.value, 'en')}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t('previous')}
              </Button>
              <span className="text-xs text-muted-foreground">
                {page} / {pages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
              >
                {t('next')}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
