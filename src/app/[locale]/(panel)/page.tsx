import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/feedback';
import { can } from '@/config/permissions';
import { getSummary } from '@/features/dashboard';
import { listOrders } from '@/features/orders';
import { OrdersPreview, OrderStatusBadge } from '@/features/sales';
import { getMe } from '@/features/staff';
import { Link } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/server';
import { formatDate, formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';

export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  return { title: t('title') };
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="panel">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 font-heading text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
    </div>
  );
}

export default async function DashboardPage({ params }: PageProps<'/[locale]'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const me = await getMe();
  const showReports = can(me.permissions, 'reports:read');
  const showOrders = can(me.permissions, 'orders:read');

  const [summary, waiting] = await Promise.all([
    showReports ? getSummary() : null,
    showOrders ? listOrders({ page: 1, status: 'PENDING' }, 5) : null,
  ]);
  const money = (amount: string) => formatMoney(amount, 'en');

  return (
    <div className="grid gap-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        {summary?.period.from && summary.period.to && summary.period.fiscalYear ? (
          <p className="text-sm text-muted-foreground">
            {t('period', {
              from: formatDate(summary.period.from, 'en'),
              to: formatDate(summary.period.to, 'en'),
              fiscalYear: summary.period.fiscalYear,
            })}
          </p>
        ) : null}
      </header>

      {summary ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <Stat
              label={t('sales')}
              value={money(summary.sales.grossTotal)}
              note={t('salesNote', {
                bills: summary.sales.bills,
                vat: money(summary.sales.vatTotal),
              })}
            />
            <Stat
              label={t('collected')}
              value={money(summary.collections.net)}
              note={t('collectedNote', {
                count: summary.collections.count,
                refunds: money(summary.collections.refunds),
              })}
            />
            <Stat
              label={t('due')}
              value={money(summary.outstanding.due.outstanding)}
              note={t('dueNote', { refunds: money(summary.outstanding.refunds.outstanding) })}
            />
          </section>

          <section className="grid gap-3">
            <h2 className="font-semibold">{t('byChannel')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {(['ONLINE', 'STORE'] as const).map((channel) => {
                const sold = summary.sales.byChannel.find((row) => row.channel === channel);
                return (
                  <Link
                    key={channel}
                    href={`${routes.orders()}?channel=${channel}`}
                    className="panel hover:border-primary"
                  >
                    <div className="text-sm text-muted-foreground">{t(`channels.${channel}`)}</div>
                    <div className="mt-1 font-heading text-2xl font-semibold">
                      {money(sold?.grossTotal ?? '0')}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t('channelNote', { bills: sold?.bills ?? 0 })}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="grid gap-3">
            <h2 className="font-semibold">{t('byStatus')}</h2>
            <div className="flex flex-wrap gap-3">
              {summary.ordersByStatus.map(({ status, orders }) => (
                <Link
                  key={status}
                  href={`${routes.orders()}?status=${status}`}
                  className="panel flex items-center gap-3 !py-3 hover:border-primary"
                >
                  <OrderStatusBadge status={status} />
                  <span className="font-heading text-xl font-semibold">{orders}</span>
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t('noReports')}</p>
      )}

      {waiting ? (
        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t('waiting')}</h2>
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
    </div>
  );
}
