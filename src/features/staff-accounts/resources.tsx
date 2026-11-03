import type { Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import type { Schema } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

type User = Schema<'UserResponse'>;
type Name = (key: string) => string;

export const ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_MANAGER',
  'INVENTORY_MANAGER',
  'ORDER_MANAGER',
  'ACCOUNTANT',
  'STORE_STAFF',
] as const;

// The API's own floor for a staff password.
const PASSWORD = { regex: /^.{12,128}$/, message: 'At least 12 characters' };

// Staff accounts; they are switched off, never deleted, so their history keeps a name.
export function usersResource(name: Name): Resource<User> {
  const roleChoices = ROLES.map((role) => ({ value: role, label: name(`roles.${role}`) }));
  return {
    key: 'users',
    path: '/admin/users',
    list: 'paged',
    rowId: (row) => row.id,
    rowLabel: (row) => row.fullName,
    initialSort: { key: 'fullName', direction: 'asc' },
    canDelete: false,
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
      {
        key: 'roles',
        cell: (row) => (
          <div className="flex flex-wrap gap-1">
            {row.roles.map((role) => (
              <Badge key={role} tone="info">
                {name(`roles.${role}`)}
              </Badge>
            ))}
          </div>
        ),
        sortValue: (row) => row.roles.join(','),
      },
      {
        key: 'lastLoginAt',
        cell: (row) => (row.lastLoginAt ? formatDateTime(row.lastLoginAt, 'en') : '—'),
        sortValue: (row) => row.lastLoginAt,
      },
      {
        key: 'status',
        cell: (row) => (
          <Badge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>
            {name(`statuses.${row.status}`)}
          </Badge>
        ),
        sortValue: (row) => row.status,
      },
    ],
    fields: [
      { name: 'fullName', kind: 'text', required: true, max: 120 },
      { name: 'email', kind: 'text', required: true, max: 254 },
      { name: 'password', kind: 'password', required: true, createOnly: true, pattern: PASSWORD },
      {
        name: 'status',
        kind: 'select',
        required: true,
        editOnly: true,
        options: (['ACTIVE', 'DISABLED'] as const).map((status) => ({
          value: status,
          label: name(`statuses.${status}`),
        })),
      },
      { name: 'roles', kind: 'multiselect', required: true, options: roleChoices },
    ],
  };
}

// A new password set by an administrator; it ends the person's sessions.
export const resetPasswordResource = (user: User): Resource<never> => ({
  key: 'users',
  path: `/admin/users/${user.id}/password`,
  list: 'all',
  rowId: () => '',
  rowLabel: () => user.fullName,
  columns: [],
  fields: [{ name: 'password', kind: 'password', required: true, pattern: PASSWORD }],
});
