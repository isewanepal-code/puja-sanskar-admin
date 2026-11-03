import { ActiveBadge, type Resource } from '@/components/resource';
import { mantraChoices } from '@/features/mantras';
import { groupChoices } from '@/features/puja-groups';

import { PUJA_KINDS, type Puja } from './types';

// The kinds as choices; their names come from resources.pujas.kinds.
export const kindChoices = (name: (kind: string) => string) =>
  PUJA_KINDS.map((kind) => ({ value: kind, label: name(kind) }));

// `groupName` names a puja's group in the list; `kindName` its kind.
export function pujasResource(
  groupName: (id: string) => string | undefined,
  kindName: (kind: string) => string,
): Resource<Puja> {
  return {
    key: 'pujas',
    path: '/admin/pujas',
    list: 'paged',
    rowId: (row) => row.id,
    rowLabel: (row) => `[${row.code}] ${row.nameNe}`,
    initialSort: { key: 'code', direction: 'asc' },
    modalSize: 'lg',
    bulk: ['code', 'nameNe', 'nameEn', 'type', 'groupId'],
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
            <div>{row.nameNe}</div>
            <div className="text-xs text-muted-foreground">{row.nameEn}</div>
          </>
        ),
        sortValue: (row) => row.nameNe,
      },
      {
        key: 'groupId',
        cell: (row) =>
          row.groupId ? (
            (groupName(row.groupId) ?? '—')
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        sortValue: (row) => (row.groupId ? groupName(row.groupId) : null),
      },
      { key: 'type', cell: (row) => kindName(row.type), sortValue: (row) => kindName(row.type) },
      {
        key: 'isActive',
        cell: (row) => <ActiveBadge on={row.isActive} />,
        sortValue: (row) => row.isActive,
      },
    ],
    fields: [
      { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
      { name: 'groupId', kind: 'select', optionsFrom: groupChoices },
      {
        name: 'type',
        kind: 'select',
        required: true,
        options: kindChoices(kindName),
        defaultValue: 'PUJA',
      },
      { name: 'mantraId', kind: 'select', optionsFrom: mantraChoices },
      { name: 'nameNe', kind: 'text', required: true, max: 160, section: 'names' },
      { name: 'nameEn', kind: 'text', required: true, max: 160 },
      { name: 'nameRomanized', kind: 'text', max: 160 },
      { name: 'traditions', kind: 'tags' },
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
