import 'server-only';

import { unwrap } from '@/lib/api';
import { sessionApi } from '@/lib/api/server';

type Days = { from: string; to: string };

// Sales, collections and order counts for the days given; the current fiscal year without them.
export async function getSummary(days?: Days) {
  return unwrap(
    (await sessionApi()).GET('/api/v1/admin/reports/summary', { params: { query: days } }),
  );
}

// Sales for every day of the period, to draw.
export async function getSalesTrend(days: Days) {
  return unwrap(
    (await sessionApi()).GET('/api/v1/admin/reports/sales-trend', { params: { query: days } }),
  );
}

// How many kits and items the shop has, and how many are left to sell.
export async function getShopCounts(show: { kits: boolean; items: boolean; stock: boolean }) {
  const api = await sessionApi();
  const page = (limit: number) => ({ params: { query: { page: 1, limit } } });
  const [kitTotal, activeKits, itemTotal, activeItems, stockSummary] = await Promise.all([
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
    // Packs in stock, low and out at the branch in view; a pack never stocked there counts as out.
    show.stock ? unwrap(api.GET('/api/v1/admin/stock-levels/summary')) : null,
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
    stock: stockSummary,
  };
}

// Money and stock that came in and went out, for the days given.
export async function getFlow(days: Days) {
  return unwrap(
    (await sessionApi()).GET('/api/v1/admin/reports/flow', { params: { query: days } }),
  );
}

// Cash and bank accounts with what each holds now.
export async function getAccounts() {
  const accounts = await unwrap((await sessionApi()).GET('/api/v1/admin/money-accounts'));
  return accounts.filter((account) => account.isActive);
}

// How many pujas the shop offers, and the festivals coming up.
export async function getPujaCounts(today: string, until: string) {
  const api = await sessionApi();
  const [pujas, active, festivals] = await Promise.all([
    unwrap(api.GET('/api/v1/admin/pujas', { params: { query: { page: 1, limit: 1 } } })),
    unwrap(
      api.GET('/api/v1/admin/pujas', { params: { query: { page: 1, limit: 1, isActive: true } } }),
    ),
    unwrap(
      api.GET('/api/v1/admin/festivals', {
        params: { query: { page: 1, limit: 100, isActive: true } },
      }),
    ),
  ]);
  const upcoming = festivals.items
    .flatMap((festival) =>
      festival.dates
        .filter((date) => date.endsOn >= today && date.startsOn <= until)
        .map((date) => ({
          id: festival.id,
          name: festival.nameEn,
          on: date.startsOn,
          to: date.endsOn,
        })),
    )
    .sort((a, b) => a.on.localeCompare(b.on))
    .slice(0, 5);
  return { total: pujas.meta.total, active: active.meta.total, upcoming };
}
