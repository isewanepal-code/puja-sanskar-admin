import { branchChoices } from '@/features/branches';
import type { Resource } from '@/components/resource';
import { request } from '@/lib/api';
import type { Schema } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';

import { StockStatus } from './components/stock-status';

type Level = Schema<'StockLevelResponse'>;
type Product = Schema<'AdminProductResponse'>;
type Movement = Schema<'StockMovementResponse'>;
type Name = (key: string) => string;

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
// In stock is where the list opens: what was bought and is on the shelf. Sizes nobody has bought yet are
// under All sizes, not mixed in.
export type StockShow = 'in' | 'low' | 'out' | 'all';

export const STOCK_SHOWS: readonly StockShow[] = ['in', 'low', 'out', 'all'];

export const parseStockShow = (value: string | undefined): StockShow =>
  STOCK_SHOWS.find((show) => show === value) ?? 'in';

async function packsOf(productId: string, show: StockShow): Promise<Level[]> {
  const product = await request<Product>('GET', `/admin/products/${productId}`);
  const levels = await Promise.all(
    product.variants.map((variant) => request<Level>('GET', `/admin/stock-levels/${variant.id}`)),
  );
  if (show === 'in') return levels.filter((level) => level.onHand > 0);
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
    path: '/admin/stock-levels',
    exportPath: '/admin/stock-levels/export',
    list: productId ? 'all' : 'paged',
    loadAll: productId ? () => packsOf(productId, show) : undefined,
    // Part of the list's cache key too, so each filter keeps its own list.
    listQuery: {
      ...(show === 'in' && { inStock: 'true' }),
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
    groupBy: {
      of: (row) => `${row.product.nameNe} · ${row.product.nameEn}`,
      label: (key) => key,
      order: [],
    },
    modalSize: 'xs',
    columns: [
      // The item is the heading above its sizes, so the first column is the size itself.
      {
        key: 'label',
        cell: (row) => <span className="font-medium">{row.variant.label}</span>,
        sortValue: (row) => row.variant.label,
      },
      {
        key: 'onHand',
        cell: (row) => <span className="font-semibold tabular-nums">{row.onHand}</span>,
        sortValue: (row) => row.onHand,
        align: 'right',
      },
      {
        // Plain words: OK, Low, Sold out, or Not bought yet; what is held for orders only when there is some.
        key: 'available',
        cell: (row) => <StockStatus level={row} />,
        sortValue: (row) => row.available,
        align: 'right',
      },
      {
        key: 'value',
        cell: (row) => (
          <div className="grid justify-items-end gap-0.5">
            <span className="tabular-nums">{formatMoney(row.value, 'en')}</span>
            {row.onHand > 0 && Number(row.avgCost) > 0 ? (
              <span className="text-[0.7rem] text-muted-foreground tabular-nums">
                {formatMoney(row.avgCost, 'en')} each
              </span>
            ) : null}
          </div>
        ),
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
