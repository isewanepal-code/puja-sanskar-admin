import { activeColumn, type Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { type Schema } from '@/lib/api';
import { choices, pagedSource, type ChoiceSource } from '@/lib/choices';

export type PriceGroup = Schema<'PriceGroupResponse'>;
export type PriceGroupDetail = Schema<'PriceGroupDetailResponse'>;
type Category = Schema<'AdminCategoryResponse'>;

const categories: ChoiceSource = pagedSource<Category>('group-categories', {
  path: '/admin/categories',
  toChoices: (row) => [{ value: row.id, label: row.nameNe, detail: row.code }],
});

export function priceGroupsResource(): Resource<PriceGroup> {
  return {
    key: 'priceGroups',
    path: '/admin/price-groups',
    list: 'paged',
    rowId: (row) => row.id,
    rowLabel: (row) => `${row.code} · ${row.name}`,
    initialSort: { key: 'name', direction: 'asc' },
    modalSize: 'sm',
    columns: [
      {
        key: 'code',
        cell: (row) => <span className="font-semibold">{row.code}</span>,
        sortValue: (row) => row.code,
      },
      { key: 'name', cell: (row) => row.name, sortValue: (row) => row.name },
      {
        key: 'memberCount',
        cell: (row) => <Badge>{row.memberCount}</Badge>,
        sortValue: (row) => row.memberCount,
        align: 'right',
      },
      activeColumn(),
    ],
    fields: [
      { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
      { name: 'name', kind: 'text', required: true, max: 160 },
      { name: 'isActive', kind: 'switch', defaultValue: true },
    ],
  };
}

// Many items and kits into a group at once: by search, by whole category, or by pasted codes.
export function addMembersResource(groupId: string): Resource<never> {
  return {
    key: 'groupMembers',
    scope: 'priceGroups',
    path: `/admin/price-groups/${groupId}/members`,
    list: 'all',
    rowId: () => '',
    rowLabel: () => '',
    columns: [],
    modalSize: 'lg',
    fields: [
      { name: 'categoryIds', kind: 'multiselect', optionsFrom: categories, wide: true },
      { name: 'productIds', kind: 'multiselect', optionsFrom: choices.products, wide: true },
      { name: 'kitIds', kind: 'multiselect', optionsFrom: choices.kits, wide: true },
      {
        name: 'codes',
        kind: 'textarea',
        wide: true,
        codec: {
          toText: (value) => (Array.isArray(value) ? value.join('\n') : ''),
          fromText: (text) =>
            text
              .split(/[\s,;]+/)
              .map((code) => code.trim())
              .filter(Boolean),
        },
      },
    ],
  };
}
