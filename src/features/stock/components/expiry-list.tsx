'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { request, type Schema } from '@/lib/api';
import { formatDate } from '@/lib/format';

type Batch = Schema<'StockBatchResponse'>;

// Dated stock, soonest first. Anything past its date can be written off in one click.
export function ExpiryList() {
  const t = useTranslations('stockWork.expiry');
  const locale = useLocale() as 'en' | 'ne';
  const toast = useToast();
  const queryClient = useQueryClient();
  const [days, setDays] = useState('30');
  const list = useQuery({
    queryKey: ['stock', 'batches', days],
    queryFn: () => request<Batch[]>('GET', `/admin/stock-batches?withinDays=${Number(days) || 30}`),
  });
  const writeOff = async (id: string) => {
    await request('POST', `/admin/stock-batches/${id}/write-off`);
    toast.success(t('writtenOff'));
    await queryClient.invalidateQueries({ queryKey: ['stock'] });
  };
  const rows = list.data ?? [];

  return (
    <section className="grid gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('note')}</p>
        </div>
        <label className="grid gap-1 text-xs text-muted-foreground">
          {t('within')}
          <input
            inputMode="numeric"
            value={days}
            onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))}
            className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          />
        </label>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('none')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted text-xs whitespace-nowrap text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{t('item')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('pack')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('qty')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('date')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('left')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('value')}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap">{b.productNameNe}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{b.packName}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.quantity}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(b.expiresOn, locale)}</td>
                  <td
                    className={`px-3 py-2 text-right whitespace-nowrap tabular-nums ${b.daysLeft < 0 ? 'text-destructive' : ''}`}
                  >
                    {b.daysLeft < 0
                      ? t('expired', { days: -b.daysLeft })
                      : b.daysLeft === 0
                        ? t('today')
                        : b.daysLeft}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.value}</td>
                  <td className="px-3 py-2 text-right">
                    {b.daysLeft < 0 ? (
                      <Button size="sm" variant="secondary" onClick={() => void writeOff(b.id)}>
                        {t('writeOff')}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
