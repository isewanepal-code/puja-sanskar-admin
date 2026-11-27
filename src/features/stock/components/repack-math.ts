import type { Schema } from '@/lib/api';
import { measureOf, type Measure } from '@/lib/unit-measure';

type Product = Schema<'AdminProductResponse'>;
export type Pack = Product['variants'][number];
export type UnitRow = { id: string; symbol: string; nameNe: string; dimension: string };
export type UnitChoice = { id: string; symbol: string; label: string };

export const whole = (text: string) => Number(text) > 0;
export const round = (n: number) => Math.round(n * 1000) / 1000;

// Weights, volumes and lengths convert (200 g, 1 kg); pieces and sets compare with their own unit.
export const knownMeasure = (pack: Pack): Measure | null =>
  pack.pack ? measureOf(pack.pack.quantity, pack.pack.unit.symbol) : null;

export const measureOfPack = (pack: Pack): Measure | null =>
  knownMeasure(pack) ??
  (pack.pack && pack.pack.quantity > 0
    ? { kind: `UNIT:${pack.pack.unit.id}`, amount: pack.pack.quantity }
    : null);

// The sizes on sale other than the one opened, small to large: the only ones packets are made of.
export function sizesToMake(packs: Pack[], sourceId: string | undefined): Pack[] {
  return packs
    .filter((pack) => pack.id !== sourceId && pack.isActive)
    .sort(
      (a, b) => (measureOfPack(a)?.amount ?? Infinity) - (measureOfPack(b)?.amount ?? Infinity),
    );
}

// The units a bought "Sack" may be said to hold: every unit of what the item is measured in, and the
// unit the small packs are counted in (a box holds 12 pcs).
export function unitChoices(packs: Pack[], units: UnitRow[]): UnitChoice[] {
  const found = new Map<string, UnitChoice>();
  const kinds = new Set(packs.flatMap((pack) => knownMeasure(pack)?.kind ?? []));
  const add = (id: string, symbol: string, nameNe: string) =>
    found.set(id, { id, symbol, label: `${nameNe} (${symbol})` });
  for (const unit of units) if (kinds.has(unit.dimension)) add(unit.id, unit.symbol, unit.nameNe);
  for (const pack of packs) {
    if (pack.pack && !knownMeasure(pack) && !found.has(pack.pack.unit.id)) {
      add(pack.pack.unit.id, pack.pack.unit.symbol, pack.pack.unit.nameNe);
    }
  }
  return [...found.values()];
}

// "12 pcs" or "5 गोटा" on a bought pack that states no size: that many pieces, nothing to ask.
// `\b` does not see where a Devanagari word ends, so the end is "no letter or mark follows".
export function looseCountOf(label: string): number {
  return Number(
    /^(\d+(?:\.\d+)?)\s*(?:pcs?|pieces?|nos?|गोटा|थान)(?![\p{L}\p{M}])/iu.exec(label)?.[1],
  );
}

// How many of the bought pack the packets use: part of a pack for weighed goods, whole packs for pieces.
export function workedPacks(input: {
  canWork: boolean;
  bulkAmount: number | undefined;
  madeAmount: number;
  lostBase: number;
  fractional: boolean;
}): number {
  const { canWork, bulkAmount, madeAmount, lostBase, fractional } = input;
  if (!canWork || !bulkAmount || madeAmount <= 0) return 0;
  return fractional
    ? round((madeAmount + lostBase) / bulkAmount)
    : Math.max(1, Math.ceil(madeAmount / bulkAmount - 1e-9));
}

// As many of one size as the rest of what is opened makes.
export function fillCount(input: {
  packAmount: number;
  bulkAmount: number;
  rest: number;
  fractional: boolean;
  openedNumber: number;
}): number {
  const { packAmount, bulkAmount, rest, fractional, openedNumber } = input;
  // Weighed goods: as many as fill the sack being opened (as many sacks as the others already need).
  const total = fractional
    ? Math.max(1, Math.ceil((rest + packAmount) / bulkAmount - 1e-9)) * bulkAmount
    : (openedNumber || 1) * bulkAmount;
  return Math.max(Math.floor((total - rest) / packAmount + 1e-9), 0);
}

// What a packet costs: the bought price shared over the packets by size.
export function costOfPack(
  costOfOne: number,
  bulk: Measure | null,
  size: Measure | null,
): number | null {
  if (!bulk || !size || size.kind !== bulk.kind || costOfOne <= 0) return null;
  return (costOfOne / bulk.amount) * size.amount;
}
