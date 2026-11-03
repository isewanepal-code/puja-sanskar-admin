import { describe, expect, it } from 'vitest';

import { codeFrom, quickItemResource, skuFrom } from './resources';

describe('quick item codes', () => {
  it('should make an item code from the English name', () => {
    expect(codeFrom('Loban dhup (pure)')).toBe('LOBAN_DHUP_PURE');
    expect(codeFrom('5 star agarbatti')).toBe('I_5_STAR_AGARBATTI');
  });

  it('should make a pack code from the item code and pack size', () => {
    expect(skuFrom('LOBAN_DHUP', '50 g')).toBe('LOBAN-DHUP-50G');
    expect(skuFrom('DIYO', '')).toBe('DIYO');
  });

  it('should nest the opening stock and fill the codes left empty', () => {
    const body = quickItemResource.shapeBody!({
      nameEn: 'Loban dhup',
      packLabel: '50 g',
      code: null,
      sku: null,
      categoryId: 'c1',
      materialId: null,
      openingQuantity: 10,
      openingUnitCost: '40',
      openingDay: null,
    });
    expect(body).toMatchObject({
      code: 'LOBAN_DHUP',
      sku: 'LOBAN-DHUP-50G',
      categoryId: 'c1',
      materialId: undefined,
      openingStock: { quantity: 10, unitCost: '40', day: undefined },
    });
    expect(body).not.toHaveProperty('openingQuantity');
  });

  it('should send no opening stock when none is given', () => {
    const body = quickItemResource.shapeBody!({
      nameEn: 'Diyo',
      packLabel: '1 piece',
      code: 'DIYO',
    });
    expect(body.openingStock).toBeUndefined();
  });
});
