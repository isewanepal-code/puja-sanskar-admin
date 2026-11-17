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
