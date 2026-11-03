import type { Resource } from '@/components/resource';
import { request } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import type { Schema } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';

type Level = Schema<'StockLevelResponse'>;
type Product = Schema<'AdminProductResponse'>;
type Movement = Schema<'StockMovementResponse'>;
type Name = (key: string) => string;

const MOVEMENT_KINDS = ['PURCHASE', 'RETURN', 'DAMAGE', 'ADJUSTMENT'] as const;

// One product's packs, each with its stock: a new pack has no stock row until its first change.
async function packsOf(productId: string, lowOnly: boolean): Promise<Level[]> {
  const product = await request<Product>('GET', `/admin/products/${productId}`);
  const levels = await Promise.all(
    product.variants.map((variant) => request<Level>('GET', `/admin/stock-levels/${variant.id}`)),
  );
  return lowOnly ? levels.filter((level) => level.isLowStock) : levels;
}

// Stock per pack; only the reorder level is set by hand, the rest follows movements.
export function stockResource(lowOnly: boolean, productId?: string): Resource<Level> {
  return {
    key: 'stock',
    path: '/admin/stock-levels',
    exportPath: '/admin/stock-levels/export',
    list: productId ? 'all' : 'paged',
    loadAll: productId ? () => packsOf(productId, lowOnly) : undefined,
    // Part of the list's cache key too, so each filter keeps its own list.
    listQuery: {
      ...(lowOnly && { lowStock: 'true' }),
      ...(productId && { productId }),
    },
    searchable: false,
    canCreate: false,
    canDelete: false,
    rowId: (row) => row.variant.id,
    rowLabel: (row) => `${row.variant.sku} · ${row.variant.label}`,
    initialSort: { key: 'available', direction: 'asc' },
    modalSize: 'xs',
    columns: [
      {
        key: 'sku',
        cell: (row) => <span className="font-semibold">{row.variant.sku}</span>,
        sortValue: (row) => row.variant.sku,
      },
      { key: 'label', cell: (row) => row.variant.label, sortValue: (row) => row.variant.label },
      { key: 'onHand', cell: (row) => row.onHand, sortValue: (row) => row.onHand, align: 'right' },
      {
        key: 'reserved',
        cell: (row) => row.reserved,
        sortValue: (row) => row.reserved,
        align: 'right',
      },
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
        key: 'updatedAt',
        cell: (row) => (row.updatedAt ? formatDateTime(row.updatedAt, 'en') : '—'),
        sortValue: (row) => row.updatedAt,
      },
    ],
    fields: [{ name: 'reorderLevel', kind: 'number', required: true }],
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
        defaultValue: 'PURCHASE',
      },
      { name: 'quantity', kind: 'number', required: true },
      { name: 'unitCost', kind: 'money' },
      { name: 'reference', kind: 'text', max: 100 },
      { name: 'note', kind: 'textarea', max: 500 },
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
