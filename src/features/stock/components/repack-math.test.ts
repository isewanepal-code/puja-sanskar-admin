import { describe, expect, it } from 'vitest';

import {
  costOfPack,
  fillCount,
  looseCountOf,
  measureOfPack,
  sizesToMake,
  unitChoices,
  workedPacks,
  type Pack,
} from './repack-math';

const pack = (id: string, quantity: number | null, symbol = 'g', isActive = true): Pack =>
  ({
    id,
    isActive,
    pack:
      quantity === null ? null : { quantity, unit: { id: `u-${symbol}`, symbol, nameNe: symbol } },
  }) as unknown as Pack;

describe('measureOfPack', () => {
  it('puts weights on one scale', () => {
    expect(measureOfPack(pack('a', 2, 'kg'))).toEqual({ kind: 'WEIGHT', amount: 2000 });
  });

  it('counts pieces by their own unit', () => {
    expect(measureOfPack(pack('a', 12, 'pcs'))).toEqual({ kind: 'UNIT:u-pcs', amount: 12 });
  });

  it('has none for a pack that states no size', () => {
    expect(measureOfPack(pack('a', null))).toBeNull();
  });
});

describe('sizesToMake', () => {
  it('leaves out the opened pack and inactive ones, small to large', () => {
    const list = [
      pack('big', 1, 'kg'),
      pack('source', 25, 'kg'),
      pack('off', 5, 'g', false),
      pack('small', 200),
    ];
    expect(sizesToMake(list, 'source').map((p) => p.id)).toEqual(['small', 'big']);
  });
});

describe('unitChoices', () => {
  const units = [
    { id: 'u-g', symbol: 'g', nameNe: 'ग्राम', dimension: 'WEIGHT' },
    { id: 'u-kg', symbol: 'kg', nameNe: 'केजी', dimension: 'WEIGHT' },
    { id: 'u-m', symbol: 'm', nameNe: 'मिटर', dimension: 'LENGTH' },
  ];

  it('offers the units of what the item is weighed in', () => {
    expect(unitChoices([pack('a', 200)], units).map((u) => u.id)).toEqual(['u-g', 'u-kg']);
  });

  it('adds the unit small packs are counted in', () => {
    expect(unitChoices([pack('a', 12, 'pcs')], units).map((u) => u.id)).toEqual(['u-pcs']);
  });
});

describe('looseCountOf', () => {
  it.each([
    ['11 pcs', 11],
    ['5 गोटा', 5],
    ['2.5 pieces', 2.5],
  ])('reads %s', (label, count) => expect(looseCountOf(label)).toBe(count));

  it('is not a number for a named pack', () => {
    expect(looseCountOf('Sack')).toBeNaN();
  });
});

describe('workedPacks', () => {
  const base = { canWork: true, bulkAmount: 25_000, lostBase: 0, fractional: true };

  it('uses part of a sack for weighed goods', () => {
    expect(workedPacks({ ...base, madeAmount: 15_000 })).toBe(0.6);
  });

  it('adds what was lost to what is used', () => {
    expect(workedPacks({ ...base, madeAmount: 12_000, lostBase: 500 })).toBe(0.5);
  });

  it('opens whole packs of pieces, at least one', () => {
    expect(workedPacks({ ...base, fractional: false, bulkAmount: 12, madeAmount: 13 })).toBe(2);
    expect(workedPacks({ ...base, fractional: false, bulkAmount: 12, madeAmount: 12 })).toBe(1);
  });

  it('is nothing until packets are made or the sum can be worked', () => {
    expect(workedPacks({ ...base, madeAmount: 0 })).toBe(0);
    expect(workedPacks({ ...base, madeAmount: 100, canWork: false })).toBe(0);
  });
});

describe('fillCount', () => {
  it('fills the sack being opened with one size', () => {
    expect(
      fillCount({
        packAmount: 1000,
        bulkAmount: 25_000,
        rest: 5000,
        fractional: true,
        openedNumber: 0,
      }),
    ).toBe(20);
  });

  it('opens another sack when the rest already fill one', () => {
    expect(
      fillCount({
        packAmount: 1000,
        bulkAmount: 25_000,
        rest: 25_000,
        fractional: true,
        openedNumber: 1,
      }),
    ).toBe(25);
  });

  it('fills the packs already chosen for pieces', () => {
    expect(
      fillCount({ packAmount: 1, bulkAmount: 12, rest: 4, fractional: false, openedNumber: 2 }),
    ).toBe(20);
  });
});

describe('costOfPack', () => {
  const bulk = { kind: 'WEIGHT', amount: 25_000 };

  it('shares the bought price by size', () => {
    expect(costOfPack(2500, bulk, { kind: 'WEIGHT', amount: 1000 })).toBe(100);
  });

  it('knows no cost across kinds or without a price', () => {
    expect(costOfPack(2500, bulk, { kind: 'LENGTH', amount: 1 })).toBeNull();
    expect(costOfPack(0, bulk, { kind: 'WEIGHT', amount: 1000 })).toBeNull();
    expect(costOfPack(2500, null, { kind: 'WEIGHT', amount: 1000 })).toBeNull();
  });
});
