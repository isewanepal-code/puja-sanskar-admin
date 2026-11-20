import { branchChoices } from '@/features/branches';
import type { Resource } from '@/components/resource';
import { request } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import type { Schema } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';

type Level = Schema<'StockLevelResponse'>;
type Product = Schema<'AdminProductResponse'>;
type Movement = Schema<'StockMovementResponse'>;
type Name = (key: string) => string;

// Buying is not here: a purchase bill (Buy page) adds stock with its supplier and cost.
const MOVEMENT_KINDS = ['RETURN', 'DAMAGE', 'ADJUSTMENT'] as const;

// Stock that leaves the shelf can be no more than what is free to use here.
const withinAvailable = (level: Level, quantity: unknown) =>
  Number(quantity) > level.available
    ? {
        field: 'quantity',
        message:
          level.available > 0
            ? `Only ${level.available} available at this branch`
            : 'None available at this branch',
      }
    : null;

// One product's packs, each with its stock: a new pack has no stock row until its first change.
export type StockShow = 'all' | 'low' | 'out';

export const STOCK_SHOWS: readonly StockShow[] = ['all', 'low', 'out'];

export const parseStockShow = (value: string | undefined): StockShow =>
  STOCK_SHOWS.find((show) => show === value) ?? 'all';

async function packsOf(productId: string, show: StockShow): Promise<Level[]> {
  const product = await request<Product>('GET', `/admin/products/${productId}`);
  const levels = await Promise.all(
    product.variants.map((variant) => request<Level>('GET', `/admin/stock-levels/${variant.id}`)),
  );
  if (show === 'low') return levels.filter((level) => level.isLowStock);
  if (show === 'out') return levels.filter((level) => level.available <= 0);
  return levels;
}

// Stock per pack; only the reorder level is set by hand, the rest follows movements.
// What narrows the stock list besides the all/low/out switch.
export type StockFilters = {
  productId?: string;
  categoryId?: string;
  groupId?: string;
  supplierId?: string;
  brand?: string;
};

export function stockResource(
  show: StockShow,
  { productId, categoryId, groupId, supplierId, brand }: StockFilters = {},
): Resource<Level> {
  return {
    key: 'stock',
    // What is on the shelf is counted right in the list: the difference is recorded as a shelf count.
    inline: {
      onHand: {
        type: 'quantity',
        allowZero: true,
        value: (row) => row.onHand,
        save: (row, value) =>
          request('POST', `/admin/stock-levels/${row.variant.id}/movements`, {
            body: {
              type: 'ADJUSTMENT',
              quantity: Number(value) - row.onHand,
              reference: 'Shelf count',
              note: `Counted ${value}, system had ${row.onHand}`,
            },
          }),
      },
    },
    path: '/admin/stock-levels',
    exportPath: '/admin/stock-levels/export',
    list: productId ? 'all' : 'paged',
    loadAll: productId ? () => packsOf(productId, show) : undefined,
    // Part of the list's cache key too, so each filter keeps its own list.
    listQuery: {
      ...(show === 'low' && { lowStock: 'true' }),
      ...(show === 'out' && { outOfStock: 'true' }),
      ...(productId && { productId }),
      ...(categoryId && { categoryId }),
      ...(groupId && { groupId }),
      ...(supplierId && { supplierId }),
      ...(brand && { brand }),
    },
    canCreate: false,
    canDelete: false,
    rowId: (row) => row.variant.id,
    rowLabel: (row) => `${row.product.nameNe} · ${row.variant.label}`,
    initialSort: { key: 'available', direction: 'asc' },
    modalSize: 'xs',
    columns: [
      {
        key: 'product',
        cell: (row) => (
          <div className="max-w-[11rem] min-w-0">
            <div className="truncate font-medium">{row.product.nameNe}</div>
            {/* The code (SKU) stays findable: hover the English name. */}
            <div className="truncate text-xs text-muted-foreground" title={row.variant.sku}>
              {row.product.nameEn}
            </div>
          </div>
        ),
        sortValue: (row) => row.product.nameEn,
      },
      { key: 'label', cell: (row) => row.variant.label, sortValue: (row) => row.variant.label },
      { key: 'onHand', cell: (row) => row.onHand, sortValue: (row) => row.onHand, align: 'right' },
      {
        key: 'available',
        cell: (row) => (
          <Badge tone={row.available <= 0 ? 'danger' : row.isLowStock ? 'warning' : 'success'}>
            {row.available}
          </Badge>
        ),
        sortValue: (row) => row.available,
        align: 'right',
      },
      {
        key: 'reorderLevel',
        cell: (row) => row.reorderLevel ?? '—',
        sortValue: (row) => row.reorderLevel,
        align: 'right',
      },
      {
        key: 'value',
        cell: (row) => formatMoney(row.value, 'en'),
        sortValue: (row) => Number(row.value),
        align: 'right',
      },
    ],
    fields: [
      {
        name: 'reorderLevel',
        kind: 'number',
        pattern: { regex: /^\d{1,6}(\.\d{1,3})?$/, message: 'A quantity such as 10 or 2.5' },
      },
      { name: 'shelfLocation', kind: 'text', max: 60 },
    ],
  };
}

// One stock change for a pack: what came in, went back, broke or was counted.
export function movementResource(level: Level, name: Name): Resource<never> {
  return {
    key: 'movements',
    scope: 'stock',
    path: `/admin/stock-levels/${level.variant.id}/movements`,
    list: 'all',
    rowId: () => '',
    rowLabel: () => level.variant.sku,
    columns: [],
    fields: [
      {
        name: 'type',
        kind: 'select',
        required: true,
        options: MOVEMENT_KINDS.map((kind) => ({ value: kind, label: name(`kinds.${kind}`) })),
      },
      {
        name: 'quantity',
        kind: 'number',
        required: true,
        pattern: { regex: /^-?\d{1,6}(\.\d{1,3})?$/, message: 'A quantity such as 12 or 1.5' },
      },
      { name: 'reference', kind: 'text', max: 100 },
      { name: 'note', kind: 'textarea', max: 500 },
    ],
    // Damage takes stock out; so does a negative adjustment.
    check: ({ type, quantity }) =>
      type === 'DAMAGE'
        ? withinAvailable(level, quantity)
        : type === 'ADJUSTMENT' && Number(quantity) < 0
          ? withinAvailable(level, -Number(quantity))
          : null,
  };
}

// A pack's stock history, newest first; it is a ledger, so nothing here is edited.
export function historyResource(level: Level, name: Name): Resource<Movement> {
  return {
    key: 'movements',
    scope: 'stock',
    path: `/admin/stock-levels/${level.variant.id}/movements`,
    list: 'paged',
    searchable: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    rowId: (row) => row.id,
    rowLabel: (row) => row.id,
    initialSort: { key: 'createdAt', direction: 'desc' },
    columns: [
      {
        key: 'createdAt',
        cell: (row) => formatDateTime(row.createdAt, 'en'),
        sortValue: (row) => row.createdAt,
      },
      { key: 'type', cell: (row) => name(`kinds.${row.type}`), sortValue: (row) => row.type },
      {
        key: 'quantity',
        cell: (row) => (row.quantity > 0 ? `+${row.quantity}` : row.quantity),
        sortValue: (row) => row.quantity,
        align: 'right',
      },
      {
        key: 'balanceAfter',
        cell: (row) => row.balanceAfter,
        sortValue: (row) => row.balanceAfter,
        align: 'right',
      },
      {
        key: 'unitCost',
        cell: (row) => (row.unitCost ? formatMoney(row.unitCost, 'en') : '—'),
        align: 'right',
      },
      { key: 'reference', cell: (row) => row.reference ?? row.note ?? '—' },
    ],
    fields: [],
  };
}

// One pack sent from the branch in the header to another, at its average cost.
export const transferStockResource = (level: Level): Resource<never> => ({
  key: 'stockTransfer',
  scope: 'stock',
  path: '/admin/stock-transfers',
  list: 'all',
  rowId: () => '',
  rowLabel: () => level.variant.sku,
  columns: [],
  fields: [
    { name: 'toBranchId', kind: 'select', required: true, optionsFrom: branchChoices },
    {
      name: 'quantity',
      kind: 'number',
      required: true,
      pattern: { regex: /^\d{1,6}(\.\d{1,3})?$/, message: 'A quantity such as 12 or 1.5' },
    },
    { name: 'note', kind: 'text', max: 500, wide: true },
  ],
  check: ({ quantity }) => withinAvailable(level, quantity),
  shapeBody: ({ toBranchId, quantity, note }) => ({
    toBranchId,
    note,
    lines: [{ variantId: level.variant.id, quantity }],
  }),
});

const QTY = { regex: /^\d{1,6}(\.\d{1,3})?$/, message: 'A quantity such as 12 or 1.5' };

// Stock that is gone: broken, past its date, lost. It leaves the shelf and shows as a loss in the reports.
export function stockLossResource(level: Level): Resource<never> {
  return {
    key: 'stockLoss',
    scope: 'stock',
    path: `/admin/stock-levels/${level.variant.id}/movements`,
    list: 'all',
    rowId: () => '',
    rowLabel: () => level.variant.sku,
    columns: [],
    fields: [
      {
        name: 'reason',
        kind: 'select',
        required: true,
        defaultValue: 'Damaged',
        options: ['Damaged', 'Expired', 'Lost', 'Spilled', 'Other'].map((value) => ({
          value,
          label: value,
        })),
      },
      { name: 'quantity', kind: 'number', required: true, pattern: QTY },
      { name: 'note', kind: 'text', max: 400, wide: true },
    ],
    check: ({ quantity }) => withinAvailable(level, quantity),
    shapeBody: ({ reason, quantity, note }) => ({
      type: 'DAMAGE',
      quantity,
      note: [reason, note].filter(Boolean).join(': '),
    }),
  };
}

// A count on the shelf: say how many there really are and the difference is recorded.
export function stockCountResource(level: Level): Resource<never> {
  return {
    key: 'stockCount',
    scope: 'stock',
    path: `/admin/stock-levels/${level.variant.id}/movements`,
    list: 'all',
    rowId: () => '',
    rowLabel: () => level.variant.sku,
    columns: [],
    fields: [{ name: 'counted', kind: 'number', required: true, pattern: QTY }],
    check: ({ counted }) =>
      Number(counted) === level.onHand
        ? { field: 'counted', message: 'That is what the system already has' }
        : null,
    shapeBody: ({ counted }) => ({
      type: 'ADJUSTMENT',
      quantity: Number(counted) - level.onHand,
      reference: 'Shelf count',
      note: `Counted ${counted}, system had ${level.onHand}`,
    }),
  };
}
