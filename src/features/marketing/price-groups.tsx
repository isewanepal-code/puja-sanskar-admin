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

// Item codes pasted from a sheet: split on spaces, commas, semicolons and new lines.
const codesCodec = {
  toText: (value: unknown) => (Array.isArray(value) ? value.join('\n') : ''),
  fromText: (text: string) =>
    text
      .split(/[\s,;]+/)
      .map((code) => code.trim())
      .filter(Boolean),
};

export function priceGroupsResource(): Resource<PriceGroup> {
  return {
    key: 'priceGroups',
    path: '/admin/price-groups',
    list: 'paged',
    rowId: (row) => row.id,
    rowLabel: (row) => `${row.code} · ${row.name}`,
    initialSort: { key: 'name', direction: 'asc' },
    modalSize: 'lg',
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
      { name: 'name', kind: 'text', required: true, max: 160, wide: true },
      // What goes in is chosen as the group is made; later, the group's list changes it.
      {
        name: 'categoryIds',
        kind: 'multiselect',
        optionsFrom: categories,
        wide: true,
        createOnly: true,
      },
      {
        name: 'productIds',
        kind: 'multiselect',
        optionsFrom: choices.products,
        wide: true,
        createOnly: true,
      },
      {
        name: 'kitIds',
        kind: 'multiselect',
        optionsFrom: choices.kits,
        wide: true,
        createOnly: true,
      },
      { name: 'codes', kind: 'textarea', wide: true, createOnly: true, codec: codesCodec },
      { name: 'isActive', kind: 'switch', defaultValue: true, editOnly: true },
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
        codec: codesCodec,
      },
    ],
  };
}
