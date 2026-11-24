import { describe, expect, it } from 'vitest';

import { codeFrom, skuFrom } from './resources';

describe('quick item codes', () => {
  it('should make an item code from the English name', () => {
    expect(codeFrom('Loban dhup (pure)')).toBe('LOBAN_DHUP_PURE');
    expect(codeFrom('5 star agarbatti')).toBe('I_5_STAR_AGARBATTI');
  });

  it('should make a pack code from the item code and pack size', () => {
    expect(skuFrom('LOBAN_DHUP', '50 g')).toBe('LOBAN-DHUP-50G');
    expect(skuFrom('DIYO', '')).toBe('DIYO');
  });
});
