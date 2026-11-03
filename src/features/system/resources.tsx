import type { Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import type { Schema } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

export type ActivityEvent = Schema<'ActivityEventResponse'>;

// Who did what; a record of the past, so nothing here changes.
export const activityResource: Resource<ActivityEvent> = {
  key: 'activity',
  path: '/admin/activity',
  list: 'paged',
  searchable: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  rowId: (row) => row.id,
  rowLabel: (row) => row.action,
  initialSort: { key: 'occurredAt', direction: 'desc' },
  columns: [
    {
      key: 'occurredAt',
      cell: (row) => formatDateTime(row.occurredAt, 'en'),
      sortValue: (row) => row.occurredAt,
    },
    {
      key: 'actor',
      cell: (row) => (
        <>
          <div>{row.actor?.fullName ?? '—'}</div>
          <div className="text-xs text-muted-foreground">{row.actorRoles.join(', ')}</div>
        </>
      ),
      sortValue: (row) => row.actor?.fullName,
    },
    {
      key: 'action',
      cell: (row) => <span className="font-medium">{row.action}</span>,
      sortValue: (row) => row.action,
    },
    { key: 'entityType', cell: (row) => row.entityType ?? '—', sortValue: (row) => row.entityType },
    {
      key: 'outcome',
      cell: (row) => (
        <Badge tone={row.outcome === 'SUCCESS' ? 'success' : 'danger'}>
          {row.outcome === 'SUCCESS' ? row.status : (row.errorCode ?? row.status)}
        </Badge>
      ),
      sortValue: (row) => row.outcome,
    },
  ],
  fields: [],
};
