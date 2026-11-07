import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { formatDate, formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';

import type { getFlow } from '../api/server';

type Flow = Awaited<ReturnType<typeof getFlow>>;

type Tile = { label: string; value: string; note?: string; href: string; tone?: 'good' | 'bad' };

// Today at a glance: sales, money in and out, and stock in and out.
export async function TodayStrip({
  today,
  flow,
  sold,
}: {
  today: string;
  flow: Flow;
  sold: { bills: number; total: string };
}) {
  const t = await getTranslations('dashboard.today');
  const money = (amount: string) => formatMoney(amount, 'en');
  const weekday = new Date(`${today}T00:00:00Z`).toLocaleDateString('en', {
    weekday: 'long',
    timeZone: 'UTC',
  });
  const tiles: Tile[] = [
    {
      label: t('sold'),
      value: money(sold.total),
      note: t('bills', { count: sold.bills }),
      href: routes.orders(),
    },
    {
      label: t('moneyIn'),
      value: money(flow.money.receipts),
      note: t('moneyInNote'),
      href: routes.moneyAccounts(),
      tone: 'good',
    },
    {
      label: t('moneyOut'),
      value: money(flow.money.out),
      note: t('moneyOutNote', {
        expenses: money(flow.money.expenses),
        suppliers: money(flow.money.supplierPayments),
      }),
      href: routes.expenses(),
      tone: 'bad',
    },
    {
      label: t('stockIn'),
      value: t('units', { count: flow.stock.unitsIn }),
      note: t('stockInNote'),
      href: routes.stock(),
    },
    {
      label: t('stockOut'),
      value: t('units', { count: flow.stock.unitsOut }),
      note: t('stockOutNote'),
      href: routes.stock(),
    },
  ];

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-base font-semibold">{t('title')}</h2>
        <span className="text-sm text-muted-foreground">
          {weekday}, {formatDate(today, 'en')}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="panel border-l-4 transition-colors hover:border-primary"
            style={{
              borderLeftColor:
                tile.tone === 'good'
                  ? 'var(--color-success)'
                  : tile.tone === 'bad'
                    ? 'var(--color-destructive)'
                    : 'var(--color-border)',
            }}
          >
            <div className="text-sm text-muted-foreground">{tile.label}</div>
            <div className="mt-1 font-heading text-xl font-semibold tabular-nums">{tile.value}</div>
            {tile.note ? (
              <div className="mt-1 text-xs text-muted-foreground">{tile.note}</div>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
