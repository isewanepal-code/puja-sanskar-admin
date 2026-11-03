import { Thumb } from '@/components/media-library/thumb';
import type { Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import type { Schema } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';

export type Customer = Schema<'CustomerResponse'>;
export type Cart = Schema<'CartResponse'>;
export type ListRequest = Schema<'AdminListRequestResponse'>;
type Message = Schema<'ContactMessageResponse'>;
type Reminder = Schema<'ReminderSubscriptionResponse'>;
type Activity = Schema<'CartActivityResponse'>;
type Name = (key: string) => string;

const money = (amount: string | null | undefined) => (amount ? formatMoney(amount, 'en') : '—');
const when = (value: string | null | undefined) => (value ? formatDateTime(value, 'en') : '—');

// Read-only lists: the customer owns these records, staff look and act on them.
const readOnly = { canCreate: false, canEdit: false, canDelete: false } as const;

export function customersResource(sort: string, name: Name): Resource<Customer> {
  return {
    key: 'customers',
    path: '/admin/customers',
    list: 'paged',
    listQuery: { sort },
    ...readOnly,
    rowId: (row) => row.id,
    rowLabel: (row) => row.fullName,
    columns: [
      {
        key: 'fullName',
        cell: (row) => (
          <>
            <div className="font-medium">{row.fullName}</div>
            <div className="text-xs text-muted-foreground">{row.email}</div>
          </>
        ),
        sortValue: (row) => row.fullName,
      },
      { key: 'phone', cell: (row) => row.phone ?? '—' },
      {
        key: 'orderCount',
        cell: (row) => row.orderCount,
        sortValue: (row) => row.orderCount,
        align: 'right',
      },
      {
        key: 'paidTotal',
        cell: (row) => money(row.paidTotal),
        sortValue: (row) => Number(row.paidTotal),
        align: 'right',
      },
      {
        key: 'dueTotal',
        cell: (row) =>
          Number(row.dueTotal) > 0 ? (
            <span className="text-destructive">{money(row.dueTotal)}</span>
          ) : (
            '—'
          ),
        sortValue: (row) => Number(row.dueTotal),
        align: 'right',
      },
      {
        key: 'lastOrderAt',
        cell: (row) => when(row.lastOrderAt),
        sortValue: (row) => row.lastOrderAt,
      },
      {
        key: 'status',
        cell: (row) => (
          <Badge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>
            {name(`statuses.${row.status}`)}
            {row.emailVerified ? ' ✓' : ''}
          </Badge>
        ),
        sortValue: (row) => row.status,
      },
    ],
    fields: [],
  };
}

export function cartsResource(name: Name): Resource<Cart> {
  return {
    key: 'carts',
    path: '/admin/carts',
    list: 'paged',
    searchable: false,
    ...readOnly,
    rowId: (row) => row.id,
    rowLabel: (row) => row.id.slice(0, 8),
    initialSort: { key: 'updatedAt', direction: 'desc' },
    columns: [
      {
        key: 'members',
        cell: (row) =>
          row.members.length > 0
            ? row.members.map((member) => member.fullName).join(', ')
            : name('guest'),
      },
      {
        key: 'status',
        cell: (row) => name(`statuses.${row.status}`),
        sortValue: (row) => row.status,
      },
      {
        key: 'itemCount',
        cell: (row) => row.itemCount,
        sortValue: (row) => row.itemCount,
        align: 'right',
      },
      {
        key: 'subtotal',
        cell: (row) => money(row.subtotal),
        sortValue: (row) => Number(row.subtotal),
        align: 'right',
      },
      {
        key: 'isShared',
        cell: (row) => (row.isShared ? <Badge tone="info">✓</Badge> : '—'),
        sortValue: (row) => row.isShared,
      },
      { key: 'updatedAt', cell: (row) => when(row.updatedAt), sortValue: (row) => row.updatedAt },
    ],
    fields: [],
  };
}

export function cartActivityResource(cartId: string, name: Name): Resource<Activity> {
  return {
    key: 'cartActivity',
    scope: 'carts',
    path: `/admin/carts/${cartId}/activity`,
    list: 'paged',
    searchable: false,
    ...readOnly,
    rowId: (row) => row.id,
    rowLabel: (row) => row.type,
    initialSort: { key: 'createdAt', direction: 'desc' },
    columns: [
      { key: 'createdAt', cell: (row) => when(row.createdAt), sortValue: (row) => row.createdAt },
      { key: 'type', cell: (row) => name(`kinds.${row.type}`), sortValue: (row) => row.type },
      {
        key: 'quantity',
        cell: (row) =>
          row.quantityBefore !== null || row.quantityAfter !== null
            ? `${row.quantityBefore ?? 0} → ${row.quantityAfter ?? 0}`
            : '—',
      },
    ],
    fields: [],
  };
}

const LIST_TONE = {
  RECEIVED: 'warning',
  IN_PROGRESS: 'info',
  READY: 'success',
  ORDERED: 'success',
  CLOSED: 'neutral',
} as const;

// Photos of a handwritten list; staff read them and fill the list.
export function listRequestsResource(name: Name): Resource<ListRequest> {
  return {
    key: 'listRequests',
    path: '/admin/list-requests',
    list: 'paged',
    canCreate: false,
    canDelete: false,
    rowId: (row) => row.id,
    rowLabel: (row) => `${row.number} · ${row.name}`,
    initialSort: { key: 'createdAt', direction: 'desc' },
    modalSize: 'sm',
    columns: [
      {
        key: 'photos',
        cell: (row) =>
          row.photos[0] ? <Thumb src={row.photos[0].thumb} size={40} className="size-10" /> : null,
      },
      {
        key: 'number',
        cell: (row) => <span className="font-semibold">{row.number}</span>,
        sortValue: (row) => row.number,
      },
      {
        key: 'name',
        cell: (row) => (
          <>
            <div>{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.phone}</div>
          </>
        ),
        sortValue: (row) => row.name,
      },
      {
        key: 'puja',
        cell: (row) => (
          <>
            <div>{row.puja?.nameNe ?? '—'}</div>
            {row.pujaDate ? (
              <div className="text-xs text-muted-foreground">{formatDate(row.pujaDate, 'en')}</div>
            ) : null}
          </>
        ),
      },
      {
        key: 'status',
        cell: (row) => <Badge tone={LIST_TONE[row.status]}>{name(`statuses.${row.status}`)}</Badge>,
        sortValue: (row) => row.status,
      },
      {
        key: 'total',
        cell: (row) => money(row.total),
        sortValue: (row) => Number(row.total ?? 0),
        align: 'right',
      },
      { key: 'createdAt', cell: (row) => when(row.createdAt), sortValue: (row) => row.createdAt },
    ],
    fields: [
      {
        name: 'status',
        kind: 'select',
        options: (['IN_PROGRESS', 'CLOSED'] as const).map((s) => ({
          value: s,
          label: name(`statuses.${s}`),
        })),
      },
      { name: 'staffNote', kind: 'textarea', max: 500 },
      { name: 'assignToMe', kind: 'switch', defaultValue: false },
    ],
  };
}

export function messagesResource(name: Name): Resource<Message> {
  return {
    key: 'contactMessages',
    path: '/admin/contact-messages',
    list: 'paged',
    searchable: false,
    canCreate: false,
    canDelete: false,
    rowId: (row) => row.id,
    rowLabel: (row) => row.name,
    initialSort: { key: 'createdAt', direction: 'desc' },
    modalSize: 'sm',
    columns: [
      { key: 'createdAt', cell: (row) => when(row.createdAt), sortValue: (row) => row.createdAt },
      {
        key: 'name',
        cell: (row) => (
          <>
            <div>{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.phone ?? row.email}</div>
          </>
        ),
        sortValue: (row) => row.name,
      },
      { key: 'message', cell: (row) => <span className="line-clamp-2">{row.message}</span> },
      {
        key: 'status',
        cell: (row) => (
          <Badge tone={row.status === 'NEW' ? 'warning' : 'success'}>
            {name(`statuses.${row.status}`)}
          </Badge>
        ),
        sortValue: (row) => row.status,
      },
    ],
    fields: [
      {
        name: 'status',
        kind: 'select',
        options: (['NEW', 'HANDLED'] as const).map((s) => ({
          value: s,
          label: name(`statuses.${s}`),
        })),
      },
      { name: 'staffNote', kind: 'textarea', max: 500 },
    ],
  };
}

export const remindersResource: Resource<Reminder> = {
  key: 'reminders',
  path: '/admin/reminder-subscriptions',
  list: 'paged',
  searchable: false,
  ...readOnly,
  rowId: (row) => row.unsubscribeToken,
  rowLabel: (row) => row.phone,
  initialSort: { key: 'createdAt', direction: 'desc' },
  columns: [
    { key: 'phone', cell: (row) => row.phone, sortValue: (row) => row.phone },
    {
      key: 'language',
      cell: (row) => (row.language === 'ne' ? 'नेपाली' : 'English'),
      sortValue: (row) => row.language,
    },
    { key: 'createdAt', cell: (row) => when(row.createdAt), sortValue: (row) => row.createdAt },
  ],
  fields: [],
};
