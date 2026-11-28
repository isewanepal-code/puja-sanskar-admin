import {
  activeColumn,
  ActiveBadge,
  discountFields,
  recordColumn,
  type Resource,
} from '@/components/resource';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { request, type Schema } from '@/lib/api';
import { branchChoices } from '@/features/branches';
import { choices } from '@/lib/choices';
import { formatMoney } from '@/lib/format';
import { searchKey } from '@/lib/nepali-fold';

import { kitSetKey, kitSetRows, type Kit, type KitSetRow } from './lib/kit-set';

export type { Kit };
type Line = Schema<'AdminKitLineResponse'>;
type Name = (key: string) => string;

const TIERS = ['BASIC', 'STANDARD', 'PREMIUM'] as const;
const money = (amount: string | null | undefined) => (amount ? formatMoney(amount, 'en') : '—');

const tierChoices = (name: Name) =>
  TIERS.map((tier) => ({ value: tier, label: name(`tiers.${tier}`) }));

const discount = discountFields({
  kind: 'discountKind',
  percent: 'discountPercent',
  amount: 'discountAmount',
  value: 'discountValue',
});

// Every kit, a set of packages (Basic, Standard, Premium) standing as one row with a value for each.
async function loadKits(groupId: string): Promise<Kit[]> {
  const all: Kit[] = [];
  for (let page = 1; ; page += 1) {
    const { items, meta } = await request<{
      items: Kit[];
      meta: { page: number; totalPages: number };
    }>('GET', '/admin/kits', { query: { page, limit: 100, ...(groupId && { groupId }) } });
    all.push(...items);
    if (meta.page >= meta.totalPages) return all;
  }
}

// One line for each package of the row, so the columns line up (names, items, prices).
const perPackage = (row: KitSetRow, show: (kit: Kit) => ReactNode) => (
  <div className="grid gap-0.5">
    {row.set.map((kit) => (
      <div key={kit.id} className="whitespace-nowrap">
        {show(kit)}
      </div>
    ))}
  </div>
);

export function kitsResource(name: Name, groupId = ''): Resource<KitSetRow> {
  const tierName = (kit: Kit) => (kit.tier ? name(`tiers.${kit.tier}`) : '—');
  return {
    key: 'kits',
    path: '/admin/kits',
    list: 'all',
    loadAll: async () => kitSetRows(await loadKits(groupId)),
    matches: (row, query) =>
      searchKey(
        [
          row.nameNe,
          row.nameEn,
          row.nameRomanized,
          ...row.aliases,
          row.puja?.nameNe,
          ...row.set.map((k) => k.code),
        ]
          .filter(Boolean)
          .join(' '),
      ).includes(query),
    rowId: (row) => row.id,
    rowLabel: (row) => row.nameNe,
    canCreate: false,
    canDelete: false,
    columns: [
      recordColumn<KitSetRow>('item', {
        image: (row) => row.images[0]?.url,
        code: (row) => kitSetKey(row),
        also: (row) => row.puja?.nameNe ?? row.nameEn,
      }),
      {
        key: 'tier',
        cell: (row) => perPackage(row, tierName),
        sortValue: (row) => row.set.length,
      },
      {
        key: 'items',
        cell: (row) => perPackage(row, (kit) => <Badge>{kit.items.length}</Badge>),
        sortValue: (row) => row.items.length,
        align: 'right',
      },
      {
        key: 'salePrice',
        cell: (row) =>
          perPackage(row, (kit) => (
            <>
              {money(kit.salePrice)}
              {kit.salePrice !== kit.price ? (
                <span className="ml-1 text-xs text-muted-foreground line-through">
                  {money(kit.price)}
                </span>
              ) : null}
            </>
          )),
        sortValue: (row) => Number(row.salePrice ?? -1),
        align: 'right',
      },
      {
        key: 'isAvailable',
        cell: (row) => (
          <Badge tone={row.set.every((kit) => kit.isAvailable) ? 'success' : 'warning'}>
            {name(row.set.every((kit) => kit.isAvailable) ? 'available' : 'unavailable')}
          </Badge>
        ),
        sortValue: (row) => row.set.every((kit) => kit.isAvailable),
      },
      {
        ...activeColumn<KitSetRow>(),
        cell: (row) => <ActiveBadge on={row.set.some((kit) => kit.isActive)} />,
        sortValue: (row) => row.set.some((kit) => kit.isActive),
      },
    ],
    fields: [],
  };
}

// Make packed kits (the items come off the shelf once) or take them apart again.
export function kitPackResource(kit: Kit, mode: 'pack' | 'unpack'): Resource<never> {
  return {
    key: 'kitPack',
    scope: 'kits',
    path: `/admin/kits/${kit.id}/${mode}`,
    list: 'all',
    rowId: () => '',
    rowLabel: () => kit.code,
    columns: [],
    fields: [{ name: 'quantity', kind: 'number', required: true }],
  };
}

// A kit filled from a puja's samagri list, each material at its default pack.
export function kitFromPujaResource(name: Name): Resource<never> {
  return {
    key: 'kitFromPuja',
    scope: 'kits',
    path: '/admin/kits/from-puja',
    list: 'all',
    rowId: () => '',
    rowLabel: () => '',
    columns: [],
    fields: [
      { name: 'pujaId', kind: 'select', required: true, optionsFrom: choices.pujas, wide: true },
      { name: 'code', kind: 'code', required: true, max: 32 },
      { name: 'tier', kind: 'select', options: tierChoices(name) },
      { name: 'nameNe', kind: 'text', required: true, max: 160 },
      { name: 'nameEn', kind: 'text', required: true, max: 160 },
      { name: 'description', kind: 'html', max: 4000 },
    ],
  };
}

const SHARED_FIELDS: Resource<never>['fields'] = [
  { name: 'nameNe', kind: 'text', required: true, max: 160 },
  { name: 'nameEn', kind: 'text', required: true, max: 160 },
  { name: 'nameRomanized', kind: 'text', max: 160 },
  { name: 'images', kind: 'images', wide: true },
  { name: 'description', kind: 'html', max: 4000 },
  ...discount.fields,
];

// One name, photos and description for a puja's Basic, Standard and Premium kits at once.
export function kitSetResource(): Resource<never> {
  return {
    key: 'kitSet',
    scope: 'kits',
    path: '/admin/kits/set',
    list: 'all',
    rowId: () => '',
    rowLabel: () => '',
    columns: [],
    shapeBody: discount.shapeBody,
    modalSize: 'lg',
    fields: [
      { name: 'pujaId', kind: 'select', required: true, optionsFrom: choices.pujas, wide: true },
      // Each package adds its tier to the code: SATYA → SATYA_BASIC.
      { name: 'code', kind: 'code', required: true, max: 22 },
      // Each package is its own kit with its own packed count.
      { name: 'packed', kind: 'switch', wide: true },
      ...SHARED_FIELDS,
    ],
  };
}

// What a puja's three kits share, changed in all of them together.
export function kitSetEditResource(pujaId: string): Resource<never> {
  return {
    key: 'kitSetEdit',
    scope: 'kits',
    path: `/admin/kits/set/${pujaId}`,
    list: 'all',
    rowId: () => '',
    rowLabel: () => '',
    columns: [],
    shapeBody: discount.shapeBody,
    submitMethod: 'PATCH',
    modalSize: 'lg',
    fields: SHARED_FIELDS,
  };
}

// The values a set's edit form starts with, taken from any one of its kits.
export const kitSetDefaults = (kit: Kit) =>
  discount.formRow({
    nameNe: kit.nameNe,
    nameEn: kit.nameEn,
    nameRomanized: kit.nameRomanized,
    aliases: kit.aliases,
    description: kit.description,
    images: kit.images,
    discountKind: kit.discountKind,
    discountPercent: kit.discountPercent,
    discountAmount: kit.discountAmount,
  });

// Sends a number of whole kits' worth of stock to another branch: every included item, in the
// quantity the kit holds, from the branch chosen at the top. Optional items stay behind.
export function kitTransferResource(kit: Kit): Resource<never> {
  return {
    key: 'kitTransfer',
    scope: 'stock',
    path: '/admin/stock-transfers',
    list: 'all',
    rowId: () => '',
    rowLabel: () => kit.code,
    columns: [],
    fields: [
      { name: 'toBranchId', kind: 'select', required: true, optionsFrom: branchChoices },
      { name: 'kits', kind: 'number', required: true, defaultValue: '1' },
      { name: 'note', kind: 'text', max: 500, wide: true },
    ],
    shapeBody: ({ toBranchId, kits, note }) => ({
      toBranchId,
      note,
      lines: kit.items
        .filter((item) => !item.isOptional)
        .map((item) => ({ variantId: item.sku.variantId, quantity: item.quantity * Number(kits) })),
    }),
  };
}

// The packs inside one kit; they come with the kit itself, so the list loads the kit.
export function kitItemsResource(kitId: string): Resource<Line> {
  return {
    key: 'kitItems',
    scope: 'kits',
    path: `/admin/kits/${kitId}/items`,
    list: 'all',
    loadAll: async () => (await request<Kit>('GET', `/admin/kits/${kitId}`)).items,
    rowId: (row) => row.id,
    rowLabel: (row) => `${row.sku.sku} · ${row.product.nameNe}`,
    matches: (row, q) =>
      searchKey(`${row.sku.sku} ${row.product.nameNe} ${row.product.nameEn}`).includes(q),
    initialSort: { key: 'sortOrder', direction: 'asc' },
    reorder: true,
    modalSize: 'sm',
    bulk: ['variantId', 'quantity'],
    columns: [
      {
        key: 'variantId',
        cell: (row) => (
          <>
            <div>{row.product.nameNe}</div>
            <div className="text-xs text-muted-foreground">
              {row.sku.sku} · {row.sku.label}
            </div>
          </>
        ),
        sortValue: (row) => row.product.nameNe,
      },
      {
        key: 'quantity',
        cell: (row) => row.quantity,
        sortValue: (row) => row.quantity,
        align: 'right',
      },
      {
        key: 'available',
        // Red when this branch cannot cover the kit's own quantity, so the short item is plain to see.
        cell: (row) => (
          <Badge
            tone={
              row.available <= 0 ? 'danger' : row.available < row.quantity ? 'warning' : 'success'
            }
          >
            {row.available}
          </Badge>
        ),
        sortValue: (row) => row.available,
        align: 'right',
      },
      {
        key: 'lineTotal',
        cell: (row) => money(row.lineTotal),
        sortValue: (row) => Number(row.lineTotal),
        align: 'right',
      },
      {
        key: 'isOptional',
        cell: (row) => (row.isOptional ? <Badge>✓</Badge> : '—'),
        sortValue: (row) => row.isOptional,
      },
      { key: 'note', cell: (row) => row.note ?? '—' },
      { key: 'sortOrder', cell: (row) => row.sortOrder, sortValue: (row) => row.sortOrder },
    ],
    fields: [
      {
        name: 'variantId',
        kind: 'select',
        required: true,
        createOnly: true,
        optionsFrom: choices.packs,
        wide: true,
      },
      {
        name: 'quantity',
        kind: 'number',
        required: true,
        pattern: { regex: /^\d{1,3}(\.\d{1,3})?$/, message: 'An amount such as 2 or 1.5' },
        defaultValue: '1',
      },
      { name: 'sortOrder', kind: 'number', editOnly: true },
      { name: 'note', kind: 'text', max: 200, wide: true },
      { name: 'isOptional', kind: 'switch', defaultValue: false },
    ],
  };
}
