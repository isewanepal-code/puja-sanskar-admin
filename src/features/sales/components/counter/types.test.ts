import { describe, expect, it } from 'vitest';

import { discountOf, EMPTY_FORM } from './types';

const form = (patch: Partial<typeof EMPTY_FORM>) => ({ ...EMPTY_FORM, ...patch });

describe('counter discount', () => {
  it('takes a percent of the subtotal', () => {
    expect(discountOf(1000, form({ discountKind: 'PERCENT', discountValue: '10' }))).toBe(100);
  });

  it('takes flat rupees, never more than the subtotal', () => {
    expect(discountOf(500, form({ discountKind: 'FLAT', discountValue: '150' }))).toBe(150);
    expect(discountOf(500, form({ discountKind: 'FLAT', discountValue: '900' }))).toBe(500);
  });

  it('caps a percent at 100 and ignores nothing, zero or rubbish', () => {
    expect(discountOf(200, form({ discountKind: 'PERCENT', discountValue: '250' }))).toBe(200);
    expect(discountOf(200, form({}))).toBe(0);
    expect(discountOf(200, form({ discountValue: '0' }))).toBe(0);
    expect(discountOf(200, form({ discountValue: 'abc' }))).toBe(0);
  });
});
