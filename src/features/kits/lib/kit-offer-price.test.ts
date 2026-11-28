import { describe, expect, it } from 'vitest';

import { kitPriceFor } from './kit-offer-price';
import type { Kit } from './kit-set';

const kit = (over: Partial<Kit>) =>
  ({
    price: '1000',
    discountKind: 'PERCENT',
    discountPercent: '10',
    discountAmount: '0',
    offerTiers: [
      { minKits: 1, kind: 'PERCENT', value: '5' },
      { minKits: 2, kind: 'PERCENT', value: '20' },
    ],
    ...over,
  }) as Kit;

describe('kitPriceFor', () => {
  it('uses the kit discount when no tier takes more', () => {
    expect(kitPriceFor(kit({}), 1)).toEqual({ price: 900, tier: null });
    expect(kitPriceFor(kit({}), 0)).toEqual({ price: 900, tier: null });
  });

  it('uses the tier reached at that many kits when it takes more', () => {
    expect(kitPriceFor(kit({}), 2)).toEqual({
      price: 800,
      tier: { minKits: 2, kind: 'PERCENT', value: '20' },
    });
  });

  it('never takes more than the price', () => {
    expect(kitPriceFor(kit({ discountKind: 'FLAT', discountAmount: '5000' }), 1).price).toBe(0);
  });
});
