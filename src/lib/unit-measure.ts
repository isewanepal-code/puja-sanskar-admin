// Pack sizes on one scale (grams, millilitres, metres), so 200 g and 1 kg can be set against a 25 kg
// bag. The same table the API uses; counted units (pieces, sacks) are not measured.
export type Kind = 'WEIGHT' | 'VOLUME' | 'LENGTH';

const TABLE: Record<string, { kind: Kind; perUnit: number }> = {
  mg: { kind: 'WEIGHT', perUnit: 0.001 },
  g: { kind: 'WEIGHT', perUnit: 1 },
  kg: { kind: 'WEIGHT', perUnit: 1000 },
  ml: { kind: 'VOLUME', perUnit: 1 },
  l: { kind: 'VOLUME', perUnit: 1000 },
  mm: { kind: 'LENGTH', perUnit: 0.001 },
  cm: { kind: 'LENGTH', perUnit: 0.01 },
  m: { kind: 'LENGTH', perUnit: 1 },
  km: { kind: 'LENGTH', perUnit: 1000 },
};

// Pieces and sets compare only with their own unit: their kind is that unit.
export type Measure = { kind: Kind | string; amount: number };

export function measureOf(
  quantity: number | null | undefined,
  symbol: string | undefined,
): Measure | null {
  if (!quantity || quantity <= 0 || !symbol) return null;
  const unit = TABLE[symbol.toLowerCase()];
  return unit ? { kind: unit.kind, amount: quantity * unit.perUnit } : null;
}

// An amount in base units, written in a unit of the pack.
export function inUnit(amount: number, symbol: string): number {
  const unit = TABLE[symbol.toLowerCase()];
  return unit ? amount / unit.perUnit : amount;
}

// The largest unit that keeps a number readable: 38 400 g reads as 38.4 kg.
export function readable(
  amount: number,
  kind: Kind | string,
  fallbackSymbol = '',
): { value: number; symbol: string } {
  if (kind !== 'WEIGHT' && kind !== 'VOLUME' && kind !== 'LENGTH') {
    return { value: Math.round(amount * 1000) / 1000, symbol: fallbackSymbol };
  }
  const big = { WEIGHT: ['kg', 'g'], VOLUME: ['L', 'ml'], LENGTH: ['m', 'cm'] }[kind];
  const perBig = TABLE[big[0].toLowerCase()]!.perUnit;
  const asBig = amount / perBig;
  return asBig >= 1
    ? { value: Math.round(asBig * 1000) / 1000, symbol: big[0] }
    : { value: Math.round(amount * 1000) / 1000, symbol: big[1] };
}
