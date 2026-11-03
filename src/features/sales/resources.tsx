import type { Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import type { Schema } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';

export type Order = Schema<'AdminOrderResponse'>;
export type Payment = Schema<'PaymentResponse'>;
export type Invoice = Schema<'InvoiceResponse'>;
type Name = (key: string) => string;

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
