import { describe, expect, it } from 'vitest';

import { autoCode } from './auto-code';

describe('autoCode', () => {
  it('makes a code from the English name, with a random end', () => {
    const code = autoCode({ from: 'Teej samagri', fallback: 'GRP' });
    expect(code).toMatch(/^TEEJ_SAMAGRI_[A-Z2-9]{4}$/);
  });

  it('falls back on the prefix when the name has no English letters', () => {
    expect(autoCode({ from: 'तीज सामग्री', fallback: 'GRP' })).toMatch(/^GRP_[A-Z2-9]{4}$/);
    expect(autoCode({ from: '', fallback: 'CAT' })).toMatch(/^CAT_[A-Z2-9]{4}$/);
  });

  it('starts with a letter, as codes must', () => {
    expect(autoCode({ from: '500 g pack', fallback: 'ITEM' })).toMatch(/^ITEM_500_G_PACK_/);
  });

  it('keeps within the length allowed, and can use hyphens for a SKU', () => {
    const long = autoCode({ from: 'x'.repeat(80), fallback: 'A', max: 22 });
    expect(long.length).toBeLessThanOrEqual(22);
    expect(autoCode({ from: 'White 120', fallback: 'SKU', separator: '-' })).toMatch(
      /^WHITE-120-[A-Z2-9]{4}$/,
    );
  });
});
