import { describe, expect, it } from 'vitest';

import { offersResource, tiersCodec, type Offer } from './offers';

const t = (key: string) => key;
const resource = offersResource(t);

const offer = {
  id: 'o1',
  code: 'TEEJ',
  name: 'Teej',
  titleEn: 'Teej offer',
  titleNe: null,
  isActive: true,
  priority: 0,
  schedule: 'WEEKLY',
  startsAt: null,
  endsAt: null,
  weekdays: [1, 2],
  dayFromMinute: 9 * 60,
  dayToMinute: 21 * 60,
  festivalId: null,
  alone: { kind: 'PRICE', value: '75.00' },
  withKit: { kind: 'PERCENT', value: '12.00' },
  allowCoupons: false,
  targets: [
    { kind: 'GROUP', refId: 'g1', excluded: false },
    { kind: 'CATEGORY', refId: 'c1', excluded: false },
    { kind: 'PRODUCT', refId: 'p9', excluded: true },
  ],
  kitTiers: [
    { minKits: 2, kind: 'PERCENT', value: '15.00' },
    { minKits: 3, kind: 'FLAT', value: '300.00' },
  ],
  createdAt: '',
  updatedAt: '',
} as unknown as Offer;

describe('the offer form', () => {
  it('opens an offer as lists the form can edit', () => {
    const row = resource.formRow!(offer);
    expect(row).toMatchObject({
      weekdays: ['1', '2'],
      dayFrom: '09:00',
      dayTo: '21:00',
      aloneKind: 'PRICE',
      aloneValue: '75.00',
      withKitKind: 'PERCENT',
      groupIds: ['g1'],
      categoryIds: ['c1'],
      leaveOutProductIds: ['p9'],
      everything: false,
    });
  });

  it('sends what the form holds back as the API takes it', () => {
    const body = resource.shapeBody!(resource.formRow!(offer));
    expect(body).toMatchObject({
      schedule: 'WEEKLY',
      weekdays: [1, 2],
      dayFromMinute: 540,
      dayToMinute: 1260,
      alone: { kind: 'PRICE', value: '75.00' },
      withKit: { kind: 'PERCENT', value: '12.00' },
      startsAt: null,
      endsAt: null,
    });
    expect(body.targets).toEqual([
      { kind: 'CATEGORY', refId: 'c1', excluded: false },
      { kind: 'GROUP', refId: 'g1', excluded: false },
      { kind: 'PRODUCT', refId: 'p9', excluded: true },
    ]);
  });

  it('leaves out the hours and days of an offer that is not weekly', () => {
    const body = resource.shapeBody!({
      ...resource.formRow!(offer),
      schedule: 'ALWAYS',
    });
    expect(body).toMatchObject({ weekdays: [], dayFromMinute: null, dayToMinute: null });
  });

  it('sends everything as one target and no rule when the kind is empty', () => {
    const body = resource.shapeBody!({
      everything: true,
      aloneKind: '',
      aloneValue: '',
      schedule: 'ALWAYS',
    });
    expect(body.alone).toBeNull();
    expect(body.targets).toEqual([{ kind: 'ALL', refId: null, excluded: false }]);
  });

  it('checks the pairs and the dates before sending', () => {
    expect(resource.check!({ schedule: 'RANGE' })?.field).toBe('startsAt');
    expect(resource.check!({ schedule: 'ALWAYS', aloneKind: 'PERCENT' })?.field).toBe('aloneValue');
    expect(resource.check!({ schedule: 'ALWAYS' })?.field).toBe('aloneKind');
    expect(
      resource.check!({ schedule: 'ALWAYS', aloneKind: 'PERCENT', aloneValue: '5' }),
    ).toBeNull();
  });
});

describe('kit tiers as text', () => {
  it('reads one tier a line, percent or rupees', () => {
    expect(tiersCodec.fromText('1: 5%\n2: 15%\n3: Rs 300\nnonsense')).toEqual([
      { minKits: 1, kind: 'PERCENT', value: '5' },
      { minKits: 2, kind: 'PERCENT', value: '15' },
      { minKits: 3, kind: 'FLAT', value: '300' },
    ]);
  });

  it('writes them back the same way', () => {
    expect(tiersCodec.toText(offer.kitTiers)).toBe('2: 15%\n3: Rs 300');
  });
});
