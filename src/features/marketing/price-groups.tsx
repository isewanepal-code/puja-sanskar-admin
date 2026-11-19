import { activeColumn, type Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { type Schema } from '@/lib/api';
import { choices, pagedSource, type ChoiceSource } from '@/lib/choices';

import { priceGroups } from './offers';

export type PriceGroup = Schema<'PriceGroupResponse'>;
export type PriceGroupDetail = Schema<'PriceGroupDetailResponse'>;
type Category = Schema<'AdminCategoryResponse'>;

const categories: ChoiceSource = pagedSource<Category>('group-categories', {
  path: '/admin/categories',
  toChoices: (row) => [{ value: row.id, label: row.nameNe, detail: row.code }],
  find: (id) => `/admin/categories/${id}`,
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
    usagePath: (row) => `/admin/usage/group/${row.id}`,
    initialSort: { key: 'name', direction: 'asc' },
    modalSize: 'lg',
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
            {row.name}
            {row.nameNe ? (
              <span className="ml-2 text-xs text-muted-foreground">{row.nameNe}</span>
            ) : null}
          </>
        ),
        sortValue: (row) => row.name,
      },
      // The groups inside this one, and the groups this one is inside.
      {
        key: 'children',
        cell: (row) =>
          row.children.length ? (
            <span className="inline-flex flex-wrap gap-1">
              {row.children.map((c) => (
                <Badge key={c.id}>{c.name}</Badge>
              ))}
            </span>
          ) : (
            '—'
          ),
        sortValue: (row) => row.children.length,
        filterValue: (row) => row.children.map((c) => c.name).join(' '),
      },
      {
        key: 'parents',
        cell: (row) =>
          row.parents.length ? (
            <span className="inline-flex flex-wrap gap-1">
              {row.parents.map((p) => (
                <Badge key={p.id} tone="info">
                  {p.name}
                </Badge>
              ))}
            </span>
          ) : (
            '—'
          ),
        sortValue: (row) => row.parents.length,
        filterValue: (row) => row.parents.map((p) => p.name).join(' '),
      },
      {
        key: 'memberCount',
        cell: (row) => <Badge>{row.memberCount}</Badge>,
        sortValue: (row) => row.memberCount,
        align: 'right',
      },
      {
        key: 'totalCount',
        cell: (row) => <Badge tone="info">{row.totalCount}</Badge>,
        sortValue: (row) => row.totalCount,
        align: 'right',
      },
      // A switch in the list: shown on the website as a way to narrow items, or not.
      {
        key: 'showOnWebsite',
        cell: (row) => (row.showOnWebsite ? '✓' : '—'),
        sortValue: (row) => row.showOnWebsite,
      },
      activeColumn(),
    ],
    // The groups inside, as the form shows them.
    formRow: (row) => ({
      ...row,
      childGroupIds: row.children.map((c) => c.id),
    }),
    fields: [
      { name: 'name', kind: 'text', required: true, max: 160 },
      { name: 'nameNe', kind: 'text', max: 160 },
      // Groups put inside this one: an offer or filter on this group reaches everything in them too.
      {
        name: 'childGroupIds',
        kind: 'multiselect',
        optionsFrom: priceGroups,
        wide: true,
        known: (row) =>
          (row as unknown as PriceGroup).children?.map((c) => ({
            value: c.id,
            label: c.name,
            detail: c.code,
          })) ?? [],
      },
      { name: 'showOnWebsite', kind: 'switch', defaultValue: false },
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
