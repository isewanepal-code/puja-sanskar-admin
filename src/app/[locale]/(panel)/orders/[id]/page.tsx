import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getOrder, StatusChip } from '@/features/orders';
import { Link } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/server';
import { isApiError } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';

async function loadOrder(id: string) {
  return getOrder(id).catch((error: unknown) => {
    if (isApiError(error) && [400, 404].includes(error.status)) notFound();
    throw error;
  });
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/orders/[id]'>): Promise<Metadata> {
  const order = await loadOrder((await params).id);
  return { title: order.number };
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? 'font-semibold' : ''}`}>
      <span className={strong ? undefined : 'text-muted-foreground'}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default async function OrderPage({ params }: PageProps<'/[locale]/orders/[id]'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'orders' });
  const order = await loadOrder((await params).id);
  const money = (amount: string) => formatMoney(amount, 'en');
  const person = order.customer;

  return (
    <div className="grid gap-6">
      <Link href={routes.orders()} className="text-sm text-primary">
        ← {t('detail.back')}
      </Link>

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-semibold">{order.number}</h1>
        <StatusChip status={order.status} />
        <span className="text-sm text-muted-foreground">
          {formatDateTime(order.createdAt, 'en')} · {t(`channel.${order.channel}`)} ·{' '}
          {t(`fulfilment.${order.fulfilment}`)}
        </span>
      </header>
      {order.cancelReason ? (
        <p className="text-sm text-destructive">
          {t('detail.cancelReason', { reason: order.cancelReason })}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="panel grid gap-4">
          <h2 className="font-semibold">{t('detail.items')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">{t('detail.item')}</th>
                  <th className="py-2 text-right font-medium">{t('detail.qty')}</th>
                  <th className="py-2 text-right font-medium">{t('detail.price')}</th>
                  <th className="py-2 text-right font-medium">{t('detail.lineTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.variantId} className="border-t border-border">
                    <td className="py-2">
                      <div>{item.productNameEn}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.variantLabel} · {item.sku}
                      </div>
                    </td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right whitespace-nowrap">{money(item.unitPrice)}</td>
                    <td className="py-2 text-right whitespace-nowrap">{money(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-1 border-t border-border pt-3 text-sm">
            <Row label={t('detail.subtotal')} value={money(order.subtotal)} />
            {order.discounts.map((discount, i) => (
              <Row key={i} label={discount.label} value={`− ${money(discount.amount)}`} />
            ))}
            <Row
              label={t('detail.delivery')}
              value={order.deliveryQuoteNeeded ? t('detail.quoteNeeded') : money(order.deliveryFee)}
            />
            <Row label={t('detail.total')} value={money(order.total)} strong />
          </div>
        </section>

        <aside className="grid content-start gap-6">
          <section className="panel grid gap-1 text-sm">
            <h2 className="mb-1 font-semibold">{t('detail.customer')}</h2>
            <div>{order.contactName ?? person?.fullName ?? t('detail.guest')}</div>
            {order.contactPhone ? <div>{order.contactPhone}</div> : null}
            {person?.email ? <div className="text-muted-foreground">{person.email}</div> : null}
          </section>

          {order.address ? (
            <section className="panel grid gap-1 text-sm">
              <h2 className="mb-1 font-semibold">{t('detail.address')}</h2>
              <div>{order.address.addressLine}</div>
              <div>{[order.address.area, order.address.city].filter(Boolean).join(', ')}</div>
              {order.address.landmark ? (
                <div className="text-muted-foreground">{order.address.landmark}</div>
              ) : null}
              {order.neededBy ? (
                <div className="mt-2">
                  {t('detail.neededBy', { date: formatDate(order.neededBy, 'en') })}
                </div>
              ) : null}
            </section>
          ) : null}

          {order.note ? (
            <section className="panel grid gap-1 text-sm">
              <h2 className="mb-1 font-semibold">{t('detail.note')}</h2>
              <p>{order.note}</p>
            </section>
          ) : null}

          <section className="panel grid gap-3 text-sm">
            <h2 className="font-semibold">{t('detail.history')}</h2>
            <ol className="grid gap-3">
              {order.history.map((change, i) => (
                <li key={i} className="grid gap-1">
                  <div className="flex items-center gap-2">
                    <StatusChip status={change.status} />
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(change.at, 'en')}
                    </span>
                  </div>
                  {change.by ? (
                    <div className="text-xs text-muted-foreground">
                      {t('detail.by', { name: change.by.fullName })}
                    </div>
                  ) : null}
                  {change.note ? <div>{change.note}</div> : null}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
