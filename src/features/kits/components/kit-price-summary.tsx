'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { request } from '@/lib/api';
import { formatMoney } from '@/lib/format';

import type { Kit } from '../resources';

const money = (amount: string) => formatMoney(amount, 'en');

// What the kit's items cost bought one by one, next to what the kit costs: a kit must come out
// cheaper than its parts, so the person making it can see that it does.
export function KitPriceSummary({ kitId }: { kitId: string }) {
  const t = useTranslations('kitPrice');
  // The same key the items list refreshes, so this follows every change to the items.
  const kit = useQuery({
    queryKey: ['kits', 'summary', kitId],
    queryFn: () => request<Kit>('GET', `/admin/kits/${kitId}`),
  });
  if (!kit.data) return null;

  const separate = Number(kit.data.price);
  const together = Number(kit.data.salePrice);
  const saved = separate - together;
  const percent = separate > 0 ? (saved / separate) * 100 : 0;
  const cheaper = saved > 0;

  return (
    <div
      className="mb-4 grid gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:grid-cols-3"
      role="status"
    >
      <div>
        <p className="text-xs text-muted-foreground">{t('separate')}</p>
        <p className="text-lg font-semibold">{money(kit.data.price)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{t('kit')}</p>
        <p className="text-lg font-semibold text-primary">{money(kit.data.salePrice)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{t('saves')}</p>
        <p className={cheaper ? 'text-lg font-semibold text-success' : 'text-lg font-semibold'}>
          {cheaper
            ? `${money(String(saved.toFixed(2)))} (${percent.toFixed(percent % 1 ? 1 : 0)}%)`
            : '—'}
        </p>
      </div>
      {!cheaper && separate > 0 ? (
        <p className="text-sm text-warning sm:col-span-3">{t('notCheaper')}</p>
      ) : null}
    </div>
  );
}
