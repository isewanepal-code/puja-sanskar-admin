import { describe, expect, it } from 'vitest';

import { repeatedRows, type Row } from './kit-package';

const row = (variantId: string, productId?: string): Row => ({
  variantId,
  productId,
  quantity: '1',
  optional: false,
  hawan: false,
});

describe('repeatedRows', () => {
  const item = (r: Row) => r.productId ?? '';

  it('finds a pack chosen twice', () => {
    expect(repeatedRows([row('a', 'p1'), row('a', 'p1')], item)).toEqual([1]);
  });

  it('finds another size of the same item', () => {
    expect(repeatedRows([row('a', 'p1'), row('b', 'p1'), row('c', 'p2')], item)).toEqual([1]);
  });

  it('knows the same pack even when its item is not known yet', () => {
    expect(repeatedRows([row('a'), row('a')], item)).toEqual([1]);
  });

  it('ignores empty rows and different items', () => {
    expect(repeatedRows([row(''), row(''), row('a', 'p1'), row('b', 'p2')], item)).toEqual([]);
  });
});
