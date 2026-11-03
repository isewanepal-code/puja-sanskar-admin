import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import type { Schema } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';

import { StatusChip } from './status-chip';

type Order = Schema<'AdminOrderResponse'>;

export function OrdersTable({ orders }: { orders: Order[] }) {
  const t = useTranslations('orders');

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">{t('columns.number')}</th>
            <th className="px-4 py-3 font-medium">{t('columns.customer')}</th>
            <th className="px-4 py-3 font-medium">{t('columns.placed')}</th>
            <th className="px-4 py-3 font-medium">{t('columns.channel')}</th>
            <th className="px-4 py-3 font-medium">{t('columns.status')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('columns.total')}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted">
              <td className="px-4 py-3 font-semibold whitespace-nowrap">
                <Link href={routes.order(order.id)} className="text-primary hover:underline">
                  {order.number}
                </Link>
              </td>
              <td className="px-4 py-3">
                <div>{order.contactName ?? order.customer?.fullName ?? '—'}</div>
                <div className="text-xs text-muted-foreground">{order.contactPhone}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {formatDateTime(order.createdAt, 'en')}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {t(`channel.${order.channel}`)} · {t(`fulfilment.${order.fulfilment}`)}
              </td>
              <td className="px-4 py-3">
                <StatusChip status={order.status} />
              </td>
              <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                {formatMoney(order.total, 'en')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
