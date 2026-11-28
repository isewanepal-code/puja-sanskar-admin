import { describe, expect, it } from 'vitest';

import { diffItems, groupKitSets, kitSetKey, packagesFromSet, type Kit } from './kit-set';

const kit = (code: string, tier: Kit['tier'], extra: Partial<Kit> = {}): Kit =>
  ({
    id: code,
    code,
    tier,
    images: [],
    items: [],
    discountKind: 'PERCENT',
    discountPercent: '10.00',
    discountAmount: '0.00',
    packed: false,
    ...extra,
  }) as unknown as Kit;

describe('kitSetKey', () => {
  it('takes the tier off the code', () => {
    expect(kitSetKey(kit('SATYA_KIT_BASIC', 'BASIC'))).toBe('SATYA_KIT');
    expect(kitSetKey(kit('LONE', null))).toBe('LONE');
  });
});

describe('groupKitSets', () => {
  it('puts the packages of one kit together, lowest first', () => {
    const sets = groupKitSets([
      kit('A_PREMIUM', 'PREMIUM'),
      kit('B_BASIC', 'BASIC'),
      kit('A_BASIC', 'BASIC'),
      kit('LONE', null),
    ]);
    expect(sets.map((s) => [s.key, s.kits.map((k) => k.tier)])).toEqual([
      ['A', ['BASIC', 'PREMIUM']],
      ['B', ['BASIC']],
      ['LONE', [null]],
    ]);
    expect(sets[0]!.lead.code).toBe('A_BASIC');
  });
});

describe('packagesFromSet', () => {
  it('turns on the tiers that exist and reads their discount', () => {
    const packages = packagesFromSet([kit('A_BASIC', 'BASIC')]);
    expect(packages.BASIC).toMatchObject({ on: true, discountKind: 'PERCENT', discount: '10.00' });
    expect(packages.STANDARD.on).toBe(false);
  });

  it('sets the hawan apart, optional only when all of it is', () => {
    const line = (variantId: string, isHawan: boolean, isOptional: boolean) => ({
      id: variantId,
      sku: { variantId },
      product: { id: `p-${variantId}` },
      quantity: 1,
      isOptional,
      isHawan,
    });
    const pkg = packagesFromSet([
      kit('A_BASIC', 'BASIC', {
        items: [line('v1', false, false), line('h1', true, true), line('h2', true, true)] as never,
      }),
    ]).BASIC;
    expect(pkg.hawanOptional).toBe(true);
    expect(pkg.rows.filter((r) => r.variantId).map((r) => [r.variantId, r.hawan])).toEqual([
      ['v1', false],
      ['h1', true],
      ['h2', true],
    ]);
  });
});

describe('diffItems', () => {
  const saved = [
    { id: 'i1', variantId: 'a', quantity: 1, isOptional: false, isHawan: false },
    { id: 'i2', variantId: 'b', quantity: 2, isOptional: false, isHawan: false },
  ];

  it('removes, changes and adds only what differs', () => {
    const result = diffItems(saved, [
      { variantId: 'a', quantity: 3, isOptional: false, isHawan: false },
      { variantId: 'c', quantity: 1, isOptional: true, isHawan: false },
    ]);
    expect(result.remove).toEqual(['i2']);
    expect(result.change).toEqual([
      { id: 'i1', body: { quantity: 3, isOptional: false, isHawan: false } },
    ]);
    expect(result.add.map((l) => l.variantId)).toEqual(['c']);
  });

  it('does nothing when nothing changed', () => {
    const same = saved.map((line) => ({
      variantId: line.variantId,
      quantity: line.quantity,
      isOptional: line.isOptional,
      isHawan: line.isHawan,
    }));
    expect(diffItems(saved, same)).toEqual({ remove: [], change: [], add: [] });
  });
});
