import { ActiveBadge, type Field, type Option, type Resource } from '@/components/resource';
import { request, type Schema } from '@/lib/api';

import { groupOptions, type Catalogue, type GroupNode } from './tree';

type RitualType = Schema<'AdminRitualTypeResponse'>;

// The tree as one indented list, for any "which group" choice.
export const groupChoices = {
  key: 'puja-groups',
  load: async (): Promise<Option[]> => {
    const catalogue = await request<Catalogue>('GET', '/admin/puja-groups/tree');
    return groupOptions(catalogue.groups).map((group) => ({
      value: group.id,
      label: `${' '.repeat(group.depth)}${group.label}`,
    }));
  },
};

const ritualTypeChoices = {
  key: 'ritual-types',
  load: async (): Promise<Option[]> =>
    (await request<RitualType[]>('GET', '/admin/ritual-types')).map((type) => ({
      value: type.id,
      label: `${type.code} · ${type.nameNe}`,
    })),
};

export const ritualTypesResource: Resource<RitualType> = {
  key: 'ritualTypes',
  path: '/admin/ritual-types',
  list: 'all',
  rowId: (row) => row.id,
  rowLabel: (row) => `${row.code} · ${row.nameNe}`,
  matches: (row, q) => `${row.code} ${row.nameNe} ${row.nameEn}`.toLowerCase().includes(q),
  initialSort: { key: 'sortOrder', direction: 'asc' },
  modalSize: 'sm',
  bulk: ['code', 'nameNe', 'nameEn'],
  columns: [
    {
      key: 'code',
      cell: (row) => <span className="font-semibold">{row.code}</span>,
      sortValue: (row) => row.code,
    },
    {
      key: 'nameNe',
      cell: (row) => (
        <>
          {row.nameNe} <span className="text-muted-foreground">· {row.nameEn}</span>
        </>
      ),
      sortValue: (row) => row.nameNe,
    },
    { key: 'sortOrder', cell: (row) => row.sortOrder, sortValue: (row) => row.sortOrder },
    {
      key: 'isActive',
      cell: (row) => <ActiveBadge on={row.isActive} />,
      sortValue: (row) => row.isActive,
    },
  ],
  fields: [
    { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
    { name: 'nameNe', kind: 'text', required: true, max: 80 },
    { name: 'nameEn', kind: 'text', required: true, max: 80 },
    { name: 'sortOrder', kind: 'number' },
    { name: 'isActive', kind: 'switch' },
  ],
};

// A group's fields; only a main group types its own code, the rest are numbered from the parent.
export function pujaGroupResource(typesCode: boolean): Resource<GroupNode> {
  const code: Field[] = typesCode
    ? [
        {
          name: 'code',
          kind: 'code',
          required: true,
          createOnly: true,
          max: 8,
          pattern: { regex: /^[A-Z]{1,8}$/, message: '1 to 8 capital letters, such as H' },
        },
      ]
    : [];
  return {
    key: 'puja-groups',
    path: '/admin/puja-groups',
    list: 'all',
    rowId: (row) => row.id,
    rowLabel: (row) => `[${row.code}] ${row.nameNe}`,
    modalSize: 'lg',
    columns: [],
    bulk: [...(typesCode ? ['code'] : []), 'nameNe', 'nameEn', 'ritualTypeId'],
    fields: [
      ...code,
      { name: 'nameNe', kind: 'text', required: true, max: 120 },
      { name: 'nameEn', kind: 'text', required: true, max: 120 },
      { name: 'nameRomanized', kind: 'text', max: 120 },
      { name: 'ritualTypeId', kind: 'select', optionsFrom: ritualTypeChoices },
      { name: 'sortOrder', kind: 'number' },
      { name: 'summaryNe', kind: 'textarea', max: 500, section: 'website' },
      { name: 'summaryEn', kind: 'textarea', max: 500 },
      { name: 'descriptionNe', kind: 'html' },
      { name: 'descriptionEn', kind: 'html' },
      { name: 'imageUrl', kind: 'image', max: 2048, wide: true },
      { name: 'slug', kind: 'slug', max: 160, section: 'seo', wide: true },
      { name: 'metaTitle', kind: 'text', max: 70, wide: true },
      { name: 'metaDescription', kind: 'textarea', max: 160 },
      { name: 'isActive', kind: 'switch' },
    ],
  };
}
