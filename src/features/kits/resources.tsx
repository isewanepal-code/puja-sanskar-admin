import { activeColumn, discountFields, recordColumn, type Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { request, type Schema } from '@/lib/api';
import { branchChoices } from '@/features/branches';
import { choices } from '@/lib/choices';
import { formatMoney } from '@/lib/format';

export type Kit = Schema<'AdminKitResponse'>;
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

export function kitsResource(name: Name): Resource<Kit> {
  return {
    key: 'kits',
    path: '/admin/kits',
    list: 'paged',
    rowId: (row) => row.id,
    rowLabel: (row) => `${row.code} · ${row.nameNe}`,
    initialSort: { key: 'sortOrder', direction: 'asc' },
    reorder: true,
    modalSize: 'lg',
    formRow: (row) => discount.formRow({ ...row, pujaId: row.puja?.id }),
    shapeBody: discount.shapeBody,
    columns: [
      recordColumn<Kit>('item', {
        image: (row) => row.images[0]?.url,
        code: (row) => row.code,
        also: (row) => row.puja?.nameNe ?? row.nameEn,
      }),
      {
        key: 'tier',
        cell: (row) => (row.tier ? name(`tiers.${row.tier}`) : '—'),
        sortValue: (row) => row.tier,
      },
      {
        key: 'items',
        cell: (row) => <Badge>{row.items.length}</Badge>,
        sortValue: (row) => row.items.length,
        align: 'right',
      },
      {
        key: 'salePrice',
        cell: (row) => (
          <>
            {money(row.salePrice)}
            {row.salePrice !== row.price ? (
              <div className="text-xs text-muted-foreground line-through">{money(row.price)}</div>
            ) : null}
          </>
        ),
        sortValue: (row) => Number(row.salePrice ?? -1),
        align: 'right',
      },
      {
        key: 'isAvailable',
        cell: (row) => (
          <Badge tone={row.isAvailable ? 'success' : 'warning'}>
            {name(row.isAvailable ? 'available' : 'unavailable')}
          </Badge>
        ),
        sortValue: (row) => row.isAvailable,
      },
      activeColumn(),
    ],
    fields: [
      { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
      { name: 'pujaId', kind: 'select', optionsFrom: choices.pujas },
      { name: 'nameNe', kind: 'text', required: true, max: 160 },
      { name: 'nameEn', kind: 'text', required: true, max: 160 },
      { name: 'nameRomanized', kind: 'text', max: 160 },
      { name: 'tier', kind: 'select', options: tierChoices(name) },
      ...discount.fields,
      { name: 'sortOrder', kind: 'number' },
      { name: 'images', kind: 'images', section: 'website' },
      { name: 'description', kind: 'html', max: 4000 },
      { name: 'slug', kind: 'slug', max: 160, section: 'seo', wide: true },
      { name: 'metaTitle', kind: 'text', max: 70, wide: true },
      { name: 'metaDescription', kind: 'textarea', max: 160 },
      { name: 'isActive', kind: 'switch' },
    ],
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
      `${row.sku.sku} ${row.product.nameNe} ${row.product.nameEn}`.toLowerCase().includes(q),
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
        pattern: { regex: /^([1-9]|[1-9]\d)$/, message: 'From 1 to 99' },
        defaultValue: '1',
      },
      { name: 'sortOrder', kind: 'number', editOnly: true },
      { name: 'note', kind: 'text', max: 200, wide: true },
      { name: 'isOptional', kind: 'switch', defaultValue: false },
    ],
  };
}
