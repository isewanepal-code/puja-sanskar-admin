import type { Kit } from './kit-set';

type Rate = { kind: 'PERCENT' | 'FLAT'; value: string };

const takenOff = (price: number, rate: Rate) =>
  Math.min(
    rate.kind === 'PERCENT' ? (price * Number(rate.value)) / 100 : Number(rate.value),
    price,
  );

// What one kit costs when `count` of them are bought: the kit's own discount, or the best offer tier
// reached at that count when it takes more off. `count` 0 is the kit's own discount alone.
export function kitPriceFor(kit: Kit, count: number): { price: number; tier: Rate | null } {
  const price = Number(kit.price);
  const own: Rate =
    kit.discountKind === 'PERCENT'
      ? { kind: 'PERCENT', value: kit.discountPercent }
      : { kind: 'FLAT', value: kit.discountAmount };
  const reached = kit.offerTiers
    .filter((tier) => tier.minKits <= count)
    .sort((a, b) => takenOff(price, b) - takenOff(price, a))[0];
  const useTier = reached !== undefined && takenOff(price, reached) > takenOff(price, own);
  return {
    price: price - takenOff(price, useTier ? reached : own),
    tier: useTier ? reached : null,
  };
}
