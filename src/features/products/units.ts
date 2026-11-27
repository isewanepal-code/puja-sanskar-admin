import { request, type Schema } from '@/lib/api';
import { wholeSource } from '@/lib/choices';

type Unit = Schema<'UnitResponse'>;
type Page = { items: Unit[] };

// How an item is sold decides which kind of unit its packs are measured in.
export const DIMENSIONS_FOR: Record<string, string[]> = {
  PIECE: ['COUNT'],
  WEIGHT: ['WEIGHT'],
  VOLUME: ['VOLUME'],
  LENGTH: ['LENGTH'],
  SIZE: ['LENGTH', 'AREA'],
};

// The units of these kinds, for a pack's unit; one source for each way of selling.
const sources = new Map<string, ReturnType<typeof wholeSource>>();
// The units that measure the same thing as this one (m, ft, inch beside cm), for a number value.
export function unitsLike(unitId: string | null) {
  const key = `units-like-${unitId ?? 'any'}`;
  if (!sources.has(key)) {
    sources.set(
      key,
      wholeSource(key, async () => {
        const all = (await request<Page>('GET', '/admin/units', { query: { limit: 100 } })).items;
        const kind = all.find((unit) => unit.id === unitId)?.dimension;
        return all
          .filter((unit) => !kind || unit.dimension === kind)
          .map((unit) => ({ value: unit.id, label: unit.nameNe, detail: unit.symbol }));
      }),
    );
  }
  return sources.get(key)!;
}

export function unitsFor(sellBy: string) {
  const dimensions = DIMENSIONS_FOR[sellBy] ?? [];
  const key = `units-for-${sellBy}`;
  if (!sources.has(key)) {
    sources.set(
      key,
      wholeSource(key, async () =>
        (await request<Page>('GET', '/admin/units', { query: { limit: 100 } })).items
          .filter((unit) => dimensions.length === 0 || dimensions.includes(unit.dimension))
          .map((unit) => ({ value: unit.id, label: unit.nameNe, detail: unit.symbol })),
      ),
    );
  }
  return sources.get(key)!;
}

// Every unit the shop has, for what a purchase may be bought in (a sack, a box, a roll, a kilo).
export const allUnits = wholeSource('units-all', async () =>
  (await request<Page>('GET', '/admin/units', { query: { limit: 100 } })).items.map((unit) => ({
    value: unit.id,
    label: unit.nameNe,
    detail: unit.symbol,
  })),
);
