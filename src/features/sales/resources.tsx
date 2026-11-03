import type { Resource } from '@/components/resource';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import type { Schema } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';

import { OrderStatusBadge } from './components/order-status-badge';

export type Order = Schema<'AdminOrderResponse'>;
export type Payment = Schema<'PaymentResponse'>;
export type Invoice = Schema<'InvoiceResponse'>;
type Name = (key: string) => string;

export type OrderStatus = Order['status'];
export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'OUT_FOR_DELIVERY',
  'READY_FOR_PICKUP',
  'COMPLETED',
  'CANCELLED',
] as const satisfies readonly OrderStatus[];
export const ORDER_CHANNELS = ['ONLINE', 'STORE'] as const satisfies readonly Order['channel'][];
export const CHECKOUT_METHODS = ['ACCOUNT', 'QUICK_PAY'] as const;

export type OrderFilter = { status?: string; channel?: string; checkoutMethod?: string };

const money = (amount: string) => formatMoney(amount, 'en');

// Every order, newest first, narrowed by status, channel and checkout; read-only here,
// the order page is where it is worked on.
export function ordersResource(filter: OrderFilter, name: Name): Resource<Order> {
  return {
    key: 'orders',
    path: '/admin/orders',
    exportPath: '/admin/orders/export',
    list: 'paged',
    listQuery: Object.fromEntries(Object.entries(filter).filter(([, value]) => !!value)),
    canCreate: false,
    canEdit: false,
    canDelete: false,
    rowId: (row) => row.id,
    rowLabel: (row) => row.number,
    initialSort: { key: 'createdAt', direction: 'desc' },
    columns: [
      {
        key: 'number',
        cell: (row) => (
          <Link href={routes.order(row.id)} className="font-semibold text-primary hover:underline">
            {row.number}
          </Link>
        ),
        sortValue: (row) => row.number,
      },
      {
        key: 'customer',
        cell: (row) => (
          <>
            <div>{row.contactName ?? row.customer?.fullName ?? '—'}</div>
            <div className="text-xs text-muted-foreground">{row.contactPhone}</div>
          </>
        ),
        sortValue: (row) => row.contactName ?? row.customer?.fullName ?? '',
      },
      {
        key: 'createdAt',
        cell: (row) => formatDateTime(row.createdAt, 'en'),
        sortValue: (row) => row.createdAt,
      },
      {
        key: 'channel',
        cell: (row) => (
          <>
            <div>{name(`channels.${row.channel}`)}</div>
            <div className="text-xs text-muted-foreground">
              {name(`fulfilments.${row.fulfilment}`)}
            </div>
          </>
        ),
        sortValue: (row) => row.channel,
      },
      {
        key: 'paymentPlan',
        cell: (row) => name(`plans.${row.paymentPlan}`),
        sortValue: (row) => row.paymentPlan,
      },
      {
        key: 'status',
        cell: (row) => <OrderStatusBadge status={row.status} />,
        sortValue: (row) => ORDER_STATUSES.indexOf(row.status),
        filterValue: (row) => row.status.replaceAll('_', ' '),
      },
      {
        key: 'total',
        cell: (row) => <span className="font-semibold">{money(row.total)}</span>,
        sortValue: (row) => Number(row.total),
        align: 'right',
      },
    ],
    fields: [],
  };
}

const METHODS = ['CASH', 'QR', 'ESEWA', 'KHALTI', 'BANK_TRANSFER', 'CARD', 'OTHER'] as const;
const PAN = { regex: /^\d{9}$/, message: 'A PAN is 9 digits' };

// A form that only sends: an action on one order or bill.
const action = (
  key: string,
  path: string,
  fields: Resource<never>['fields'],
  extra: Partial<Resource<never>> = {},
): Resource<never> => ({
  key,
  scope: 'orders',
  path,
  list: 'all',
  rowId: () => '',
  rowLabel: () => '',
  columns: [],
  fields,
  ...extra,
});

const methodField = (name: Name) => ({
  name: 'method',
  kind: 'select' as const,
  required: true,
  options: METHODS.map((method) => ({ value: method, label: name(`methods.${method}`) })),
  defaultValue: 'CASH',
});

// Only the moves the API allows from where the order is now.
export const statusResource = (order: Order, name: Name) =>
  action(
    'orderStatus',
    `/admin/orders/${order.id}/status`,
    [
      {
        name: 'status',
        kind: 'select',
        required: true,
        options: order.nextStatuses.map((status) => ({
          value: status,
          label: name(`statuses.${status}`),
        })),
        defaultValue: order.nextStatuses[0],
      },
      { name: 'note', kind: 'textarea', max: 500 },
      ...(order.deliveryQuoteNeeded ? [{ name: 'deliveryFee', kind: 'money' as const }] : []),
    ],
    { submitMethod: 'PATCH' },
  );

export const deliveryFeeResource = (order: Order) =>
  action(
    'deliveryFee',
    `/admin/orders/${order.id}/delivery-fee`,
    [{ name: 'deliveryFee', kind: 'money', required: true }],
    {
      submitMethod: 'PATCH',
    },
  );

export const receivePaymentResource = (order: Order, name: Name) =>
  action(
    'receivePayment',
    `/admin/orders/${order.id}/payments`,
    [
      methodField(name),
      { name: 'amount', kind: 'money' },
      { name: 'reference', kind: 'text', max: 100 },
      { name: 'paidAt', kind: 'datetime' },
      { name: 'note', kind: 'textarea', max: 500 },
      { name: 'issueBill', kind: 'switch', defaultValue: true },
      { name: 'buyerPan', kind: 'text', pattern: PAN },
    ],
    { idempotent: true },
  );

export const refundResource = (order: Order, name: Name) =>
  action(
    'refund',
    `/admin/orders/${order.id}/refunds`,
    [
      methodField(name),
      { name: 'amount', kind: 'money' },
      { name: 'reference', kind: 'text', max: 100 },
      { name: 'note', kind: 'textarea', max: 500 },
    ],
    { idempotent: true },
  );

export const voidPaymentResource = (payment: Payment) =>
  action('voidPayment', `/admin/payments/${payment.id}/void`, [
    { name: 'reason', kind: 'textarea', required: true, max: 500 },
  ]);

export const issueBillResource = (order: Order) =>
  action('issueBill', `/admin/orders/${order.id}/invoices`, [
    { name: 'buyerPan', kind: 'text', pattern: PAN },
  ]);

export const voidBillResource = (invoice: Invoice) =>
  action(
    'voidBill',
    `/admin/invoices/${invoice.id}/void`,
    [{ name: 'reason', kind: 'textarea', required: true, max: 500 }],
    {
      scope: 'bills',
    },
  );

// Bills are kept as issued: they are printed, shared or voided, never edited.
export function billsResource(name: Name): Resource<Invoice> {
  return {
    key: 'bills',
    path: '/admin/invoices',
    list: 'paged',
    canCreate: false,
    canEdit: false,
    canDelete: false,
    rowId: (row) => row.id,
    rowLabel: (row) => row.number,
    initialSort: { key: 'issuedOn', direction: 'desc' },
    columns: [
      {
        key: 'number',
        cell: (row) => <span className="font-semibold">{row.number}</span>,
        sortValue: (row) => row.number,
      },
      { key: 'orderNumber', cell: (row) => row.orderNumber, sortValue: (row) => row.orderNumber },
      {
        key: 'issuedOn',
        cell: (row) => (
          <>
            <div>{formatDate(row.issuedOn, 'en')}</div>
            <div className="text-xs text-muted-foreground">{row.issuedOnBs}</div>
          </>
        ),
        sortValue: (row) => row.issuedAt,
      },
      {
        key: 'buyer',
        cell: (row) => (
          <>
            <div>{row.buyer.name}</div>
            {row.buyer.pan ? (
              <div className="text-xs text-muted-foreground">PAN {row.buyer.pan}</div>
            ) : null}
          </>
        ),
        sortValue: (row) => row.buyer.name,
      },
      { key: 'kind', cell: (row) => name(`kinds.${row.kind}`), sortValue: (row) => row.kind },
      {
        key: 'vatTotal',
        cell: (row) => formatMoney(row.vatTotal, 'en'),
        sortValue: (row) => Number(row.vatTotal),
        align: 'right',
      },
      {
        key: 'payableTotal',
        cell: (row) => <span className="font-medium">{formatMoney(row.payableTotal, 'en')}</span>,
        sortValue: (row) => Number(row.payableTotal),
        align: 'right',
      },
      {
        key: 'status',
        cell: (row) => (
          <Badge tone={row.status === 'ISSUED' ? 'success' : 'danger'}>
            {name(`statuses.${row.status}`)}
          </Badge>
        ),
        sortValue: (row) => row.status,
      },
    ],
    fields: [],
  };
}
