import type { Option, Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { accountChoices } from '@/features/money';
import { request, type Schema } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';

export type Supplier = Schema<'SupplierResponse'>;
export type PurchaseBill = Schema<'PurchaseBillResponse'>;
export type SupplierPayment = Schema<'SupplierPaymentResponse'>;
type Name = (key: string) => string;
type Page<T> = { items: T[] };

const money = (amount: string) => formatMoney(amount, 'en');
const PAN = { regex: /^\d{9}$/, message: 'A PAN is 9 digits' };

export const supplierChoices = {
  key: 'suppliers',
  load: async (): Promise<Option[]> =>
    (await request<Page<Supplier>>('GET', '/admin/suppliers', { query: { limit: 100 } })).items
      .filter((s) => s.isActive)
      .map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` })),
};

// Who the shop buys from, with what it owes each (2.36).
export function suppliersResource(): Resource<Supplier> {
  return {
    key: 'suppliers',
    path: '/admin/suppliers',
    list: 'paged',
    canDelete: false,
    rowId: (row) => row.id,
    rowLabel: (row) => row.name,
    modalSize: 'md',
    columns: [
      {
        key: 'name',
        cell: (row) => (
          <>
            <div className="font-medium">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.code}</div>
          </>
        ),
        sortValue: (row) => row.name,
      },
      { key: 'panNumber', cell: (row) => row.panNumber ?? '—', sortValue: (row) => row.panNumber },
      { key: 'phone', cell: (row) => row.phone ?? '—', sortValue: (row) => row.phone },
      {
        key: 'owed',
        cell: (row) => (
          <span
            className={Number(row.owed) > 0 ? 'font-semibold text-destructive' : 'font-semibold'}
          >
            {money(row.owed)}
          </span>
        ),
        sortValue: (row) => Number(row.owed),
        align: 'right',
      },
      {
        key: 'isActive',
        cell: (row) => (
          <Badge tone={row.isActive ? 'success' : 'neutral'}>{row.isActive ? '✓' : '—'}</Badge>
        ),
        sortValue: (row) => row.isActive,
      },
    ],
    fields: [
      { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
      { name: 'name', kind: 'text', required: true, max: 160 },
      { name: 'panNumber', kind: 'text', pattern: PAN },
      { name: 'phone', kind: 'text', max: 20 },
      { name: 'address', kind: 'text', max: 300, wide: true },
      { name: 'openingBalance', kind: 'money' },
      { name: 'isActive', kind: 'switch', defaultValue: true },
    ],
  };
}

const STATUS_TONE = { DRAFT: 'warning', POSTED: 'success' } as const;

// Supplier bills, drafts and posted; the form is its own screen because of its lines.
export function purchaseBillsResource(
  name: Name,
  suppliers: Map<string, string>,
): Resource<PurchaseBill> {
  return {
    key: 'purchaseBills',
    path: '/admin/purchase-bills',
    list: 'paged',
    canCreate: false,
    canEdit: false,
    canDelete: false,
    rowId: (row) => row.id,
    rowLabel: (row) => row.supplierBillNumber,
    columns: [
      {
        key: 'billDay',
        cell: (row) => formatDate(row.billDay, 'en'),
        sortValue: (row) => row.billDay,
      },
      {
        key: 'supplierId',
        cell: (row) => (
          <>
            <div className="font-medium">{suppliers.get(row.supplierId) ?? '—'}</div>
            <div className="text-xs text-muted-foreground">{row.supplierBillNumber}</div>
          </>
        ),
        sortValue: (row) => suppliers.get(row.supplierId) ?? '',
      },
      {
        key: 'lines',
        cell: (row) => row.lines.length,
        sortValue: (row) => row.lines.length,
        align: 'right',
      },
      {
        key: 'vatTotal',
        cell: (row) => money(row.vatTotal),
        sortValue: (row) => Number(row.vatTotal),
        align: 'right',
      },
      {
        key: 'total',
        cell: (row) => <span className="font-semibold">{money(row.total)}</span>,
        sortValue: (row) => Number(row.total),
        align: 'right',
      },
      {
        key: 'status',
        cell: (row) => (
          <Badge tone={STATUS_TONE[row.status]}>{name(`statuses.${row.status}`)}</Badge>
        ),
        sortValue: (row) => row.status,
      },
    ],
    fields: [],
  };
}

// Paying suppliers out of the branch's accounts.
export function supplierPaymentsResource(
  name: Name,
  suppliers: Map<string, string>,
): Resource<SupplierPayment> {
  return {
    key: 'supplierPayments',
    path: '/admin/supplier-payments',
    list: 'paged',
    canEdit: false,
    canDelete: false,
    searchable: false,
    rowId: (row) => row.id,
    rowLabel: (row) => suppliers.get(row.supplierId) ?? '',
    modalSize: 'md',
    columns: [
      { key: 'day', cell: (row) => formatDate(row.day, 'en'), sortValue: (row) => row.day },
      {
        key: 'supplierId',
        cell: (row) => suppliers.get(row.supplierId) ?? '—',
        sortValue: (row) => suppliers.get(row.supplierId) ?? '',
      },
      { key: 'reference', cell: (row) => row.reference ?? '—' },
      {
        key: 'amount',
        cell: (row) => (
          <span className={row.status === 'VOID' ? 'line-through' : 'font-semibold'}>
            {money(row.amount)}
          </span>
        ),
        sortValue: (row) => Number(row.amount),
        align: 'right',
      },
      {
        key: 'status',
        cell: (row) => (
          <Badge tone={row.status === 'VOID' ? 'neutral' : 'success'}>
            {name(`statuses.${row.status}`)}
          </Badge>
        ),
        sortValue: (row) => row.status,
      },
    ],
    fields: [
      { name: 'supplierId', kind: 'select', required: true, optionsFrom: supplierChoices },
      { name: 'accountId', kind: 'select', required: true, optionsFrom: accountChoices },
      { name: 'amount', kind: 'money', required: true },
      { name: 'day', kind: 'date' },
      { name: 'reference', kind: 'text', max: 100 },
      { name: 'note', kind: 'textarea', max: 500 },
    ],
  };
}

export const voidSupplierPaymentResource = (payment: SupplierPayment): Resource<never> => ({
  key: 'voidSupplierPayment',
  scope: 'supplierPayments',
  path: `/admin/supplier-payments/${payment.id}/void`,
  list: 'all',
  rowId: () => '',
  rowLabel: () => '',
  columns: [],
  fields: [{ name: 'reason', kind: 'text', required: true, max: 500, wide: true }],
});
