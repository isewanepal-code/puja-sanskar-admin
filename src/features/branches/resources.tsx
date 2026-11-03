import type { Option, Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { request, type Schema } from '@/lib/api';

export type Branch = Schema<'BranchResponse'>;
type Name = (key: string) => string;

const CODE = {
  regex: /^[A-Z][A-Z0-9]{1,5}$/,
  message: '2 to 6 capital letters or digits, starting with a letter',
};

// Every branch, for picking where staff work, where stock goes, and the like.
export const branchChoices = {
  key: 'branches',
  load: async (): Promise<Option[]> =>
    (await request<Branch[]>('GET', '/admin/branches'))
      .filter((b) => b.isActive)
      .map((b) => ({ value: b.id, label: `${b.code} · ${b.name}` })),
};

// Physical stores: their own counter, stock, staff, bill series and books.
export function branchesResource(name: Name): Resource<Branch> {
  return {
    key: 'branches',
    path: '/admin/branches',
    list: 'all',
    canDelete: false,
    rowId: (row) => row.id,
    rowLabel: (row) => `${row.code} · ${row.name}`,
    matches: (row, q) => `${row.code} ${row.name} ${row.address}`.toLowerCase().includes(q),
    modalSize: 'md',
    columns: [
      {
        key: 'code',
        cell: (row) => <span className="font-semibold">{row.code}</span>,
        sortValue: (row) => row.code,
      },
      {
        key: 'name',
        cell: (row) => (
          <>
            <div className="flex items-center gap-2">
              {row.name}
              {row.servesOnline ? <Badge tone="info">{name('online')}</Badge> : null}
            </div>
            <div className="text-xs text-muted-foreground">{row.address}</div>
          </>
        ),
        sortValue: (row) => row.name,
      },
      { key: 'phone', cell: (row) => row.phone },
      {
        key: 'billPrefix',
        cell: (row) =>
          row.billPrefix ? (
            <span className="font-mono text-xs">{row.billPrefix}-2083/84-000001</span>
          ) : (
            <span className="font-mono text-xs">2083/84-000001</span>
          ),
        sortValue: (row) => row.billPrefix,
      },
      {
        key: 'staffCount',
        cell: (row) => row.staffCount,
        sortValue: (row) => row.staffCount,
        align: 'right',
      },
      {
        key: 'isActive',
        cell: (row) => (
          <Badge tone={row.isActive ? 'success' : 'neutral'}>
            {name(row.isActive ? 'open' : 'closed')}
          </Badge>
        ),
        sortValue: (row) => row.isActive,
      },
    ],
    fields: [
      { name: 'code', kind: 'code', required: true, createOnly: true, pattern: CODE },
      { name: 'name', kind: 'text', required: true, max: 120 },
      { name: 'address', kind: 'text', required: true, max: 300, wide: true },
      { name: 'phone', kind: 'text', required: true, max: 20 },
      { name: 'billPrefix', kind: 'code', pattern: CODE },
      { name: 'isActive', kind: 'switch', defaultValue: true },
    ],
  };
}

// Where one staff member works; the whole list is replaced.
export const staffBranchesResource = (userId: string): Resource<never> => ({
  key: 'staffBranches',
  scope: 'users',
  path: `/admin/users/${userId}/branches`,
  list: 'all',
  submitMethod: 'PUT',
  rowId: () => '',
  rowLabel: () => '',
  columns: [],
  fields: [{ name: 'branchIds', kind: 'multiselect', optionsFrom: branchChoices }],
});
