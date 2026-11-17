import { activeColumn, type Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { request, type Schema } from '@/lib/api';
import { choices, wholeSource } from '@/lib/choices';

import { unitsLike } from './units';

export type OptionType = Schema<'OptionTypeResponse'>;
export type OptionValue = Schema<'OptionValueResponse'>;

const KINDS = ['CHOICE', 'COLOR', 'NUMBER'] as const;
type Name = (key: string) => string;

// The kinds of difference (colour, size, weight …) staff keep once for every product.
export function optionTypesResource(name: Name): Resource<OptionType> {
  return {
    key: 'optionTypes',
    path: '/admin/option-types',
    list: 'all',
    rowId: (row) => row.id,
    rowLabel: (row) => `${row.code} · ${row.nameEn}`,
    matches: (row, q) => `${row.code} ${row.nameEn} ${row.nameNe}`.toLowerCase().includes(q),
    initialSort: { key: 'sortOrder', direction: 'asc' },
    modalSize: 'md',
    columns: [
      {
        key: 'code',
        cell: (row) => <span className="font-semibold">{row.code}</span>,
        sortValue: (row) => row.code,
      },
      {
        key: 'nameEn',
        cell: (row) => (
          <>
            <div>{row.nameEn}</div>
            <div className="text-xs text-muted-foreground">{row.nameNe}</div>
          </>
        ),
        sortValue: (row) => row.nameEn,
      },
      { key: 'kind', cell: (row) => name(`kinds.${row.kind}`), sortValue: (row) => row.kind },
      {
        key: 'values',
        cell: (row) => <Badge>{row.values.length}</Badge>,
        sortValue: (row) => row.values.length,
        align: 'right',
      },
      { key: 'sortOrder', cell: (row) => row.sortOrder, sortValue: (row) => row.sortOrder },
      activeColumn(),
    ],
    // A unit goes only with a number option; a stale one must not be sent.
    shapeBody: ({ unitId, kind, ...rest }) =>
      kind === 'NUMBER' ? { ...rest, kind, unitId } : { ...rest, kind },
    fields: [
      { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
      { name: 'nameEn', kind: 'text', required: true, max: 80 },
      { name: 'nameNe', kind: 'text', required: true, max: 80 },
      {
        name: 'kind',
        kind: 'select',
        required: true,
        createOnly: true,
        defaultValue: 'CHOICE',
        options: KINDS.map((kind) => ({ value: kind, label: name(`kinds.${kind}`) })),
      },
      {
        name: 'unitId',
        kind: 'select',
        optionsFrom: choices.units,
        // Only a number has a unit (g, cm …).
        showWhen: (values) => values.kind === 'NUMBER',
      },
      { name: 'sortOrder', kind: 'number', defaultValue: '0' },
      { name: 'isActive', kind: 'switch', defaultValue: true },
    ],
    check: ({ kind, unitId }) =>
      kind === 'NUMBER' && !unitId
        ? { field: 'unitId', message: name('rules.unit') }
        : kind !== 'NUMBER' && unitId
          ? { field: 'unitId', message: name('rules.noUnit') }
          : null,
  };
}

// One value of a kind of difference: only the fields its kind needs.
export function optionValueResource(type: OptionType, value?: OptionValue): Resource<never> {
  return {
    key: 'optionValues',
    scope: 'optionTypes',
    path: value ? `/admin/option-values/${value.id}` : `/admin/option-types/${type.id}/values`,
    submitMethod: value ? 'PATCH' : 'POST',
    list: 'all',
    rowId: () => '',
    rowLabel: () => '',
    columns: [],
    modalSize: 'sm',
    fields: [
      // A number value is named from its number and unit, so its names may stay empty.
      ...(type.kind === 'NUMBER'
        ? [
            { name: 'numberValue', kind: 'money' as const, required: true },
            {
              name: 'unitId',
              kind: 'select' as const,
              optionsFrom: unitsLike(type.unitId ?? null),
              defaultValue: value?.unitId ?? type.unitId ?? undefined,
              required: true,
            },
          ]
        : []),
      { name: 'valueEn', kind: 'text', required: type.kind !== 'NUMBER', max: 80 },
      { name: 'valueNe', kind: 'text', required: type.kind !== 'NUMBER', max: 80 },
      ...(type.kind === 'COLOR'
        ? [
            {
              name: 'colorHex',
              kind: 'color' as const,
              required: true,
              defaultValue: '#ffffff',
              max: 7,
            },
          ]
        : []),
      { name: 'sortOrder', kind: 'number' },
    ],
  };
}

// Every value of every kind, to choose a pack's values; each kind heads its own run.
export const optionValueChoices = wholeSource('option-values', async () =>
  (await request<OptionType[]>('GET', '/admin/option-types')).flatMap((type) =>
    type.values.map((value) => ({
      value: value.id,
      label: value.valueEn,
      detail: value.valueNe,
      group: type.nameEn,
    })),
  ),
);
