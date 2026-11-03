import type { Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { type Schema } from '@/lib/api';
import { choices } from '@/lib/choices';

type Requirement = Schema<'AdminRequirementResponse'>;
type Name = (key: string) => string;

const QUANTITY_TYPES = ['EXACT', 'APPROXIMATE', 'AS_OFFERED', 'AS_RITUAL'] as const;
const LEVELS = ['CORE', 'OPTIONAL'] as const;
const STATUSES = ['UNVERIFIED', 'REVIEWED', 'VERIFIED'] as const;

const TONE = {
  UNVERIFIED: 'neutral',
  INDICATIVE: 'info',
  REVIEWED: 'warning',
  VERIFIED: 'success',
} as const;

const amount = (row: Requirement, name: Name) =>
  row.quantity.value !== null && row.quantity.value !== undefined
    ? `${row.quantity.value} ${row.quantity.unit?.symbol ?? ''}`.trim()
    : name(`quantityTypes.${row.quantity.type}`);

// What a puja needs: each samagri, how much and how strictly, with where that came from.
export function requirementsResource(pujaId: string, name: Name): Resource<Requirement> {
  return {
    key: 'requirements',
    scope: 'pujas',
    path: `/admin/pujas/${pujaId}/requirements`,
    list: 'all',
    rowId: (row) => row.id,
    rowLabel: (row) => row.material.nameNe,
    matches: (row, q) =>
      `${row.material.code} ${row.material.nameNe} ${row.material.nameEn}`
        .toLowerCase()
        .includes(q),
    initialSort: { key: 'sortOrder', direction: 'asc' },
    bulk: ['materialId', 'quantityType', 'quantityValue', 'unitId', 'requiredLevel'],
    // The API's rule: a counted amount has a number and a unit; "as offered" has neither.
    check: ({ quantityType, quantityValue, unitId }) => {
      const counted = quantityType === 'EXACT' || quantityType === 'APPROXIMATE';
      if (counted && !quantityValue)
        return { field: 'quantityValue', message: name('rules.amount') };
      if (counted && !unitId) return { field: 'unitId', message: name('rules.unit') };
      if (!counted && (quantityValue || unitId)) {
        return { field: 'quantityValue', message: name('rules.none') };
      }
      return null;
    },
    formRow: (row) => ({
      ...row,
      materialId: row.material.id,
      quantityType: row.quantity.type,
      quantityValue: row.quantity.value,
      unitId: row.quantity.unit?.id,
      sourceId: row.source?.id,
    }),
    columns: [
      {
        key: 'materialId',
        cell: (row) => (
          <>
            <div>{row.material.nameNe}</div>
            <div className="text-xs text-muted-foreground">
              {row.specification ?? row.material.code}
            </div>
          </>
        ),
        sortValue: (row) => row.material.nameNe,
      },
      {
        key: 'quantityValue',
        cell: (row) => amount(row, name),
        sortValue: (row) => row.quantity.value,
      },
      {
        key: 'requiredLevel',
        cell: (row) => (
          <Badge tone={row.requiredLevel === 'CORE' ? 'info' : 'neutral'}>
            {name(`levels.${row.requiredLevel}`)}
          </Badge>
        ),
        sortValue: (row) => row.requiredLevel,
      },
      {
        key: 'verificationStatus',
        cell: (row) => (
          <Badge tone={TONE[row.verificationStatus]}>
            {name(`statuses.${row.verificationStatus}`)}
          </Badge>
        ),
        sortValue: (row) => row.verificationStatus,
      },
      {
        key: 'sourceId',
        cell: (row) => row.source?.name ?? '—',
        sortValue: (row) => row.source?.name,
      },
      { key: 'sortOrder', cell: (row) => row.sortOrder, sortValue: (row) => row.sortOrder },
    ],
    fields: [
      {
        name: 'materialId',
        kind: 'select',
        required: true,
        createOnly: true,
        optionsFrom: choices.materials,
        wide: true,
      },
      {
        name: 'quantityType',
        kind: 'select',
        required: true,
        options: QUANTITY_TYPES.map((type) => ({
          value: type,
          label: name(`quantityTypes.${type}`),
        })),
        defaultValue: 'APPROXIMATE',
      },
      {
        name: 'requiredLevel',
        kind: 'select',
        required: true,
        options: LEVELS.map((level) => ({ value: level, label: name(`levels.${level}`) })),
        defaultValue: 'CORE',
      },
      {
        name: 'quantityValue',
        kind: 'number',
        pattern: { regex: /^\d+(\.\d{1,3})?$/, message: 'An amount such as 10 or 0.5' },
      },
      { name: 'unitId', kind: 'select', optionsFrom: choices.units },
      { name: 'specification', kind: 'text', max: 500, wide: true },
      { name: 'notes', kind: 'textarea', max: 1000 },
      { name: 'sourceId', kind: 'select', optionsFrom: choices.sources, wide: true },
    ],
  };
}

// Marks how sure the shop is of one line; needs knowledge:verify.
export function verifyResource(pujaId: string, row: Requirement, name: Name): Resource<never> {
  return {
    key: 'verify',
    scope: 'pujas',
    path: `/admin/pujas/${pujaId}/requirements/${row.id}/verification`,
    list: 'all',
    rowId: () => '',
    rowLabel: () => row.material.nameNe,
    columns: [],
    fields: [
      {
        name: 'status',
        kind: 'select',
        required: true,
        options: STATUSES.map((status) => ({ value: status, label: name(`statuses.${status}`) })),
        defaultValue: 'REVIEWED',
      },
      { name: 'sourceId', kind: 'select', optionsFrom: choices.sources },
    ],
  };
}
