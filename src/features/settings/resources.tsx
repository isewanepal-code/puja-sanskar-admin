import { ActiveBadge, type Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/format';
import type { Schema } from '@/lib/api';

type TaxClass = Schema<'TaxClassResponse'>;
type Zone = Schema<'DeliveryZoneResponse'>;
type Slot = Schema<'AdminDeliverySlotResponse'>;
type Place = { city: string; area: string };

type Name = (key: string) => string;

const TAX_KINDS = ['STANDARD', 'ZERO_RATED', 'EXEMPT'] as const;

const money = (amount: string | null | undefined) => (amount ? formatMoney(amount, 'en') : '—');

const active = <T extends { isActive: boolean }>() => ({
  key: 'isActive',
  cell: (row: T) => <ActiveBadge on={row.isActive} />,
  sortValue: (row: T) => row.isActive,
});

export function taxClassesResource(name: Name): Resource<TaxClass> {
  return {
    key: 'taxClasses',
    path: '/admin/tax-classes',
    list: 'all',
    rowId: (row) => row.id,
    rowLabel: (row) => `${row.code} · ${row.name}`,
    matches: (row, q) => `${row.code} ${row.name}`.toLowerCase().includes(q),
    initialSort: { key: 'code', direction: 'asc' },
    columns: [
      {
        key: 'code',
        cell: (row) => <span className="font-semibold">{row.code}</span>,
        sortValue: (row) => row.code,
      },
      { key: 'name', cell: (row) => row.name, sortValue: (row) => row.name },
      { key: 'kind', cell: (row) => name(`kinds.${row.kind}`), sortValue: (row) => row.kind },
      {
        key: 'ratePercent',
        cell: (row) => (row.currentRatePercent ? `${row.currentRatePercent}%` : '—'),
        sortValue: (row) => Number(row.currentRatePercent ?? -1),
        align: 'right',
      },
      {
        key: 'rates',
        cell: (row) => <Badge>{row.rates.length}</Badge>,
        sortValue: (row) => row.rates.length,
        align: 'right',
      },
      active<TaxClass>(),
    ],
    fields: [
      { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
      { name: 'name', kind: 'text', required: true, max: 120 },
      {
        name: 'kind',
        kind: 'select',
        required: true,
        createOnly: true,
        options: TAX_KINDS.map((kind) => ({ value: kind, label: name(`kinds.${kind}`) })),
        defaultValue: 'STANDARD',
      },
      { name: 'ratePercent', kind: 'percent', createOnly: true },
      { name: 'effectiveFrom', kind: 'date', createOnly: true },
      { name: 'isActive', kind: 'switch', editOnly: true },
    ],
  };
}

// A new rate for one tax class, from a date on.
export const taxRateResource = (taxClass: TaxClass): Resource<never> => ({
  key: 'taxClasses',
  path: `/admin/tax-classes/${taxClass.id}/rates`,
  list: 'all',
  rowId: () => '',
  rowLabel: () => taxClass.name,
  columns: [],
  fields: [
    { name: 'ratePercent', kind: 'percent', required: true },
    { name: 'effectiveFrom', kind: 'date', required: true },
  ],
});

// One place per line, "city / area"; that is how staff already write them.
const places = {
  toText: (value: unknown) =>
    (value as Place[]).map((place) => `${place.city} / ${place.area}`).join('\n'),
  fromText: (text: string) =>
    text
      .split('\n')
      .map((line) => line.split('/').map((part) => part.trim()))
      .filter(([city, area]) => city && area)
      .map(([city, area]) => ({ city, area })),
};

export const deliveryZonesResource: Resource<Zone> = {
  key: 'deliveryZones',
  path: '/admin/delivery-zones',
  list: 'all',
  rowId: (row) => row.id,
  rowLabel: (row) => row.name,
  matches: (row, q) =>
    `${row.name} ${row.areas.map((a) => `${a.city} ${a.area}`).join(' ')}`
      .toLowerCase()
      .includes(q),
  initialSort: { key: 'sortOrder', direction: 'asc' },
  modalSize: 'lg',
  columns: [
    {
      key: 'name',
      cell: (row) => <span className="font-semibold">{row.name}</span>,
      sortValue: (row) => row.name,
    },
    {
      key: 'fee',
      cell: (row) => money(row.fee),
      sortValue: (row) => Number(row.fee),
      align: 'right',
    },
    {
      key: 'freeAbove',
      cell: (row) => money(row.freeAbove),
      sortValue: (row) => Number(row.freeAbove ?? -1),
      align: 'right',
    },
    {
      key: 'expressFee',
      cell: (row) => money(row.expressFee),
      sortValue: (row) => Number(row.expressFee ?? -1),
      align: 'right',
    },
    {
      key: 'areas',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.areas
            .slice(0, 3)
            .map((place) => place.area)
            .join(', ')}
          {row.areas.length > 3 ? ` +${row.areas.length - 3}` : ''}
        </span>
      ),
      sortValue: (row) => row.areas.length,
    },
    { key: 'sortOrder', cell: (row) => row.sortOrder, sortValue: (row) => row.sortOrder },
    active<Zone>(),
  ],
  fields: [
    { name: 'name', kind: 'text', required: true, max: 80, wide: true },
    { name: 'fee', kind: 'money', required: true },
    { name: 'freeAbove', kind: 'money' },
    { name: 'expressFee', kind: 'money' },
    { name: 'sortOrder', kind: 'number' },
    { name: 'areas', kind: 'textarea', required: true, codec: places },
    { name: 'isActive', kind: 'switch' },
  ],
};

export const deliverySlotsResource: Resource<Slot> = {
  key: 'deliverySlots',
  path: '/admin/delivery-slots',
  list: 'all',
  rowId: (row) => row.id,
  rowLabel: (row) => row.nameNe,
  matches: (row, q) => `${row.nameNe} ${row.nameEn}`.toLowerCase().includes(q),
  initialSort: { key: 'startsAt', direction: 'asc' },
  modalSize: 'sm',
  bulk: ['nameNe', 'nameEn', 'startsAt', 'endsAt'],
  columns: [
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
    { key: 'startsAt', cell: (row) => row.startsAt, sortValue: (row) => row.startsAt },
    { key: 'endsAt', cell: (row) => row.endsAt, sortValue: (row) => row.endsAt },
    { key: 'sortOrder', cell: (row) => row.sortOrder, sortValue: (row) => row.sortOrder },
    active<Slot>(),
  ],
  fields: [
    { name: 'nameNe', kind: 'text', required: true, max: 80 },
    { name: 'nameEn', kind: 'text', required: true, max: 80 },
    { name: 'startsAt', kind: 'time', required: true },
    { name: 'endsAt', kind: 'time', required: true },
    { name: 'sortOrder', kind: 'number' },
    { name: 'isActive', kind: 'switch' },
  ],
};
