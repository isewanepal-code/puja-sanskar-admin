import type { Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import type { Schema } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';

export type SalesReturn = Schema<'SalesReturnResponse'>;
export type Reason = SalesReturn['reason'];
type Name = (key: string) => string;

export const REASONS = [
  'DAMAGED',
  'WRONG_ITEM',
  'QUALITY',
  'NOT_AS_DESCRIBED',
  'CHANGED_MIND',
  'NOT_NEEDED',
  'LATE_DELIVERY',
  'OTHER',
] as const satisfies readonly Reason[];

// Goods customers brought back; a return is kept as recorded, never edited.
export function salesReturnsResource(name: Name): Resource<SalesReturn> {
  return {
    key: 'salesReturns',
    path: '/admin/sales-returns',
    list: 'paged',
    canCreate: false,
    canEdit: false,
    canDelete: false,
    rowId: (row) => row.id,
    rowLabel: (row) => row.displayNumber,
    initialSort: { key: 'createdAt', direction: 'desc' },
    columns: [
      {
        key: 'displayNumber',
        cell: (row) => <span className="font-semibold">{row.displayNumber}</span>,
        sortValue: (row) => row.number,
      },
      {
        key: 'orderNumber',
        cell: (row) => (
          <Link href={routes.order(row.orderId)} className="text-primary hover:underline">
            {row.orderNumber}
          </Link>
        ),
        sortValue: (row) => row.orderNumber,
      },
      {
        key: 'customer',
        cell: (row) => (
          <>
            <div>{row.contactName ?? '—'}</div>
            {row.contactPhone ? (
              <div className="text-xs text-muted-foreground">{row.contactPhone}</div>
            ) : null}
          </>
        ),
        sortValue: (row) => row.contactName ?? '',
      },
      {
        key: 'reason',
        cell: (row) => name(`reasons.${row.reason}`),
        sortValue: (row) => row.reason,
      },
      {
        key: 'items',
        cell: (row) => (
          <>
            <Badge>{row.lines.reduce((sum, line) => sum + line.quantity, 0)}</Badge>
            {row.lines.some((line) => line.outcome === 'WRITE_OFF') ? (
              <Badge tone="warning" className="ml-1">
                {name('outcomes.WRITE_OFF')}
              </Badge>
            ) : null}
          </>
        ),
        sortValue: (row) => row.lines.length,
        align: 'right',
      },
      {
        key: 'creditTotal',
        cell: (row) => <span className="font-medium">{formatMoney(row.creditTotal, 'en')}</span>,
        sortValue: (row) => Number(row.creditTotal),
        align: 'right',
      },
      {
        key: 'createdAt',
        cell: (row) => formatDateTime(row.createdAt, 'en'),
        sortValue: (row) => row.createdAt,
      },
    ],
    fields: [],
  };
}
