import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/feedback';
import { can } from '@/config/permissions';
import {
  addDays,
  BarRow,
  BranchFlow,
  CashAndBank,
  changeOf,
  FlowPanels,
  getAccounts,
  getFlow,
  getPujaCounts,
  getSalesTrend,
  getShopCounts,
  getSummary,
  KpiCard,
  parseRange,
  periodsFor,
  PujasPanel,
  RangeTabs,
  ShopCounts,
  shopToday,
  TodayStrip,
  TrendChart,
} from '@/features/dashboard';
import { listOrders } from '@/features/orders';
import { OrdersPreview, OrderStatusBadge } from '@/features/sales';
import { getMe } from '@/features/staff';
import { Link } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/server';
import { formatDate, formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  return { title: t('title') };
}

const CHANNELS = ['STORE', 'ONLINE'] as const;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export default async function DashboardPage({ params, searchParams }: PageProps<'/[locale]'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const me = await getMe();
  const range = parseRange((await searchParams).range?.toString());
  const { current, previous } = periodsFor(range);
  const showReports = can(me.permissions, 'reports:read');
  const showOrders = can(me.permissions, 'orders:read');
  const showCatalogue = can(me.permissions, 'catalogue:read');
  const showStock = can(me.permissions, 'inventory:read');

  const showMoney = can(me.permissions, 'money:read');
  const today = shopToday();
  const [now, before, trend, trendBefore, waiting, counts, flowToday, flow, accounts, pujas] =
    await Promise.all([
      showReports ? getSummary(current) : null,
      showReports ? getSummary(previous) : null,
      showReports ? getSalesTrend(current) : null,
      showReports ? getSalesTrend(previous) : null,
      showOrders ? listOrders({ page: 1, status: 'PENDING' }, 5) : null,
      getShopCounts({ kits: showCatalogue, items: showCatalogue, stock: showStock }),
      showReports ? getFlow({ from: today, to: today }) : null,
      showReports ? getFlow(current) : null,
      showMoney ? getAccounts() : null,
      showCatalogue ? getPujaCounts(today, addDays(today, 45)) : null,
    ]);
  const money = (amount: string) => formatMoney(amount, 'en');
  const against = t('against', { days: range });

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('range', {
              from: formatDate(current.from, 'en'),
              to: formatDate(current.to, 'en'),
            })}
          </p>
        </div>
        {showReports ? (
          <RangeTabs current={range} label={(days) => t('lastDays', { days })} />
        ) : null}
      </header>

      {flowToday && trend ? (
        <TodayStrip
          today={today}
          flow={flowToday}
          sold={{
            bills: trend.days.at(-1)?.bills ?? 0,
            total: trend.days.at(-1)?.grossTotal ?? '0',
          }}
        />
      ) : null}

      {now && before && trend && trendBefore ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              label={t('sales')}
              value={money(now.sales.grossTotal)}
              change={changeOf(Number(now.sales.grossTotal), Number(before.sales.grossTotal))}
              against={against}
              newLabel={t('newFigure')}
              spark={trend.days.map((day) => Number(day.grossTotal))}
            />
            <KpiCard
              label={t('collected')}
              value={money(now.collections.net)}
              change={changeOf(Number(now.collections.net), Number(before.collections.net))}
              against={against}
              newLabel={t('newFigure')}
              note={t('collectedNote', {
                count: now.collections.count,
                refunds: money(now.collections.refunds),
              })}
            />
            <KpiCard
              label={t('bills')}
              value={String(now.sales.bills)}
              change={changeOf(now.sales.bills, before.sales.bills)}
              against={against}
              newLabel={t('newFigure')}
              spark={trend.days.map((day) => day.bills)}
            />
            <KpiCard
              label={t('ordersPlaced')}
              value={String(sum(now.ordersByStatus.map((row) => row.orders)))}
              change={changeOf(
                sum(now.ordersByStatus.map((row) => row.orders)),
                sum(before.ordersByStatus.map((row) => row.orders)),
              )}
              against={against}
              newLabel={t('newFigure')}
            />
            <div className="panel grid content-start gap-1">
              <div className="text-sm text-muted-foreground">{t('due')}</div>
              <div className="font-heading text-2xl font-semibold tabular-nums">
                {money(now.outstanding.due.outstanding)}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('dueNote', { refunds: money(now.outstanding.refunds.outstanding) })}
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="panel lg:col-span-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold">{t('salesPerDay')}</h2>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded bg-primary" />
                    {t('thisPeriod')}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded border-t-2 border-dashed border-muted-foreground" />
                    {t('previousPeriod')}
                  </span>
                </div>
              </div>
              <TrendChart
                current={trend.days.map((day) => ({ day: day.day, value: Number(day.grossTotal) }))}
                previous={trendBefore.days.map((day) => ({
                  day: day.day,
                  value: Number(day.grossTotal),
                }))}
                currentLabel={t('thisPeriod')}
                previousLabel={t('previousPeriod')}
                summary={t('chartSummary', {
                  now: money(now.sales.grossTotal),
                  before: money(before.sales.grossTotal),
                  days: range,
                })}
                empty={t('noSales')}
              />
            </div>

            <div className="panel grid content-start gap-5">
              <h2 className="text-base font-semibold">{t('byChannel')}</h2>
              {CHANNELS.map((channel) => {
                const soldNow = Number(
                  now.sales.byChannel.find((row) => row.channel === channel)?.grossTotal ?? 0,
                );
                const soldBefore = Number(
                  before.sales.byChannel.find((row) => row.channel === channel)?.grossTotal ?? 0,
                );
                const total = Number(now.sales.grossTotal);
                const change = changeOf(soldNow, soldBefore);
                return (
                  <Link
                    key={channel}
                    href={`${routes.orders()}?channel=${channel}`}
                    className="grid gap-1.5 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm text-muted-foreground">
                        {t(`channels.${channel}`)}
                      </span>
                      <span
                        className={cn(
                          'text-xs font-semibold tabular-nums',
                          change === null || change === 0
                            ? 'text-muted-foreground'
                            : change > 0
                              ? 'text-success'
                              : 'text-destructive',
                        )}
                      >
                        {change === null
                          ? t('newFigure')
                          : `${change > 0 ? '▲' : change < 0 ? '▼' : '–'} ${Math.abs(change).toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="font-heading text-xl font-semibold tabular-nums">
                      {money(soldNow.toFixed(2))}
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          channel === 'STORE' ? 'bg-primary' : 'bg-warning',
                        )}
                        style={{ width: `${total > 0 ? Math.round((soldNow / total) * 100) : 0}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('share', { percent: total > 0 ? Math.round((soldNow / total) * 100) : 0 })}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="panel grid content-start gap-3">
              <h2 className="text-base font-semibold">{t('byStatus')}</h2>
              {now.ordersByStatus.length > 0 ? (
                now.ordersByStatus.map(({ status, orders }) => (
                  <Link
                    key={status}
                    href={`${routes.orders()}?status=${status}`}
                    className="rounded-md hover:bg-muted/50"
                  >
                    <BarRow
                      label={<OrderStatusBadge status={status} />}
                      value={orders}
                      max={Math.max(...now.ordersByStatus.map((row) => row.orders), 1)}
                      display={String(orders)}
                    />
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t('noOrders')}</p>
              )}
            </div>
            {waiting ? (
              <div className="grid content-start gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">{t('waiting')}</h2>
                  <Link href={`${routes.orders()}?status=PENDING`} className="text-sm text-primary">
                    {t('seeAll')}
                  </Link>
                </div>
                {waiting.items.length > 0 ? (
                  <OrdersPreview orders={waiting.items} />
                ) : (
                  <EmptyState title={t('noneWaiting')} icon="check" />
                )}
              </div>
            ) : null}
          </section>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{t('noReports')}</p>
          {waiting ? (
            <section className="grid gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">{t('waiting')}</h2>
                <Link href={`${routes.orders()}?status=PENDING`} className="text-sm text-primary">
                  {t('seeAll')}
                </Link>
              </div>
              {waiting.items.length > 0 ? (
                <OrdersPreview orders={waiting.items} />
              ) : (
                <EmptyState title={t('noneWaiting')} icon="check" />
              )}
            </section>
          ) : null}
        </>
      )}

      {flow ? <FlowPanels flow={flow} /> : null}
      {flow ? <BranchFlow flow={flow} /> : null}

      <ShopCounts counts={counts} />

      {accounts || pujas ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {accounts ? <CashAndBank accounts={accounts} /> : null}
          {pujas ? <PujasPanel pujas={pujas} /> : null}
        </section>
      ) : null}
    </div>
  );
}
