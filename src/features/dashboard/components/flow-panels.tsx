import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';

import type { getFlow } from '../api/server';

import { BarRow } from './bar-row';

type Flow = Awaited<ReturnType<typeof getFlow>>;

// Over the chosen days: where the money came from and went, and what stock moved and why.
export async function FlowPanels({ flow }: { flow: Flow }) {
  const t = await getTranslations('dashboard.flow');
  const money = (amount: string) => formatMoney(amount, 'en');
  const lines = [
    { key: 'receipts', amount: flow.money.receipts, tone: 'good', href: routes.dayBook() },
    { key: 'expenses', amount: flow.money.expenses, tone: 'bad', href: routes.expenses() },
    {
      key: 'supplierPayments',
      amount: flow.money.supplierPayments,
      tone: 'warn',
      href: routes.supplierPayments(),
    },
    { key: 'refunds', amount: flow.money.refunds, tone: 'bad', href: routes.dayBook() },
  ] as const;
  const top = Math.max(...lines.map((line) => Number(line.amount)), 1);
  const moved = flow.stock.byType.filter((row) => row.unitsIn > 0 || row.unitsOut > 0);
  const most = Math.max(...moved.flatMap((row) => [row.unitsIn, row.unitsOut]), 1);
  const kept =
    Number(flow.money.receipts) -
    Number(flow.money.refunds) -
    Number(flow.money.expenses) -
    Number(flow.money.supplierPayments);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="panel grid content-start gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">{t('money')}</h2>
          <span className="text-xs text-muted-foreground">
            {t('left')}{' '}
            <span
              className={
                kept < 0 ? 'font-semibold text-destructive' : 'font-semibold text-foreground'
              }
            >
              {money(kept.toFixed(2))}
            </span>
          </span>
        </div>
        {lines.map((line) => (
          <Link key={line.key} href={line.href} className="rounded-md hover:bg-muted/50">
            <BarRow
              label={t(`lines.${line.key}`)}
              value={Number(line.amount)}
              max={top}
              display={money(line.amount)}
              tone={line.tone}
            />
          </Link>
        ))}
      </div>

      <div className="panel grid content-start gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">{t('stock')}</h2>
          <span className="text-xs text-muted-foreground">
            {t('stockTotals', { into: flow.stock.unitsIn, out: flow.stock.unitsOut })}
          </span>
        </div>
        {moved.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noMovement')}</p>
        ) : (
          moved.map((row) => (
            <Link key={row.type} href={routes.stock()} className="rounded-md hover:bg-muted/50">
              <BarRow
                label={t(`types.${row.type}`)}
                value={row.unitsIn || row.unitsOut}
                max={most}
                display={
                  row.unitsIn > 0 && row.unitsOut > 0
                    ? `+${row.unitsIn} / −${row.unitsOut}`
                    : row.unitsIn > 0
                      ? `+${row.unitsIn}`
                      : `−${row.unitsOut}`
                }
                tone={row.unitsOut > 0 && row.unitsIn === 0 ? 'warn' : 'good'}
              />
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
