import 'server-only';

import { unwrap } from '@/lib/api';
import { sessionApi } from '@/lib/api/server';

// Sales, collections and order counts for the current fiscal year so far.
export async function getSummary() {
  return unwrap((await sessionApi()).GET('/api/v1/admin/reports/summary'));
}

// How many kits and items the shop has, and how many are left to sell.
export async function getShopCounts(show: { kits: boolean; items: boolean; stock: boolean }) {
  const api = await sessionApi();
  const page = (limit: number) => ({ params: { query: { page: 1, limit } } });
  const levels = (filters: { lowStock?: boolean; outOfStock?: boolean }) =>
    unwrap(
      api.GET('/api/v1/admin/stock-levels', {
        params: { query: { page: 1, limit: 1, ...filters } },
      }),
    );

  const [kitTotal, activeKits, itemTotal, activeItems, tracked, low, out] = await Promise.all([
    show.kits ? unwrap(api.GET('/api/v1/admin/kits', page(1))) : null,
    show.kits
      ? unwrap(
          api.GET('/api/v1/admin/kits', {
            params: { query: { page: 1, limit: 100, isActive: true } },
          }),
        )
      : null,
    show.items ? unwrap(api.GET('/api/v1/admin/products', page(1))) : null,
    show.items
      ? unwrap(
          api.GET('/api/v1/admin/products', {
            params: { query: { page: 1, limit: 1, isActive: true } },
          }),
        )
      : null,
    show.stock ? levels({}) : null,
    show.stock ? levels({ lowStock: true }) : null,
    show.stock ? levels({ outOfStock: true }) : null,
  ]);

  const kits = activeKits?.items ?? [];
  return {
    kits: kitTotal
      ? {
          total: kitTotal.meta.total,
          active: activeKits?.meta.total ?? 0,
          // Active kits whose every included item is on the shelf.
          ready: kits.filter((kit) => kit.availableCount > 0).length,
          // Fewest left first: these run out soonest.
          left: [...kits].sort((a, b) => a.availableCount - b.availableCount).slice(0, 8),
        }
      : null,
    items: itemTotal ? { total: itemTotal.meta.total, active: activeItems?.meta.total ?? 0 } : null,
    stock: tracked
      ? { tracked: tracked.meta.total, low: low?.meta.total ?? 0, out: out?.meta.total ?? 0 }
      : null,
  };
}
