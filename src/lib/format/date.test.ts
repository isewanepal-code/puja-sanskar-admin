import { describe, expect, it } from 'vitest';

import { adToBs, bsMonthLength, bsToAd } from './bikram-sambat';
import { formatDate, formatDateTime } from './date';

describe('formatDate', () => {
  it("should show a timestamp on the shop's own day, Nepali date first", () => {
    // 19:00 UTC is already the next morning in Kathmandu.
    expect(formatDate('2026-11-07T19:00:00Z', 'en')).toBe('22 Kartik 2083 · 8 Nov');
  });

  it('should show a calendar day as that day', () => {
    expect(formatDate('2026-11-08', 'en')).toBe('22 Kartik 2083 · 8 Nov');
  });

  it('should keep the time with the day', () => {
    expect(formatDateTime('2026-11-03T06:34:00Z', 'en')).toBe('17 Kartik · 3 Nov, 12:19');
  });
});

describe('Bikram Sambat', () => {
  it('should convert both ways', () => {
    expect(adToBs({ year: 2026, month: 11, day: 3 })).toEqual({ year: 2083, month: 7, day: 17 });
    expect(bsToAd({ year: 2083, month: 1, day: 1 })).toEqual({ year: 2026, month: 4, day: 14 });
  });

  it('should know how long each month is', () => {
    expect(bsMonthLength(2083, 7)).toBeGreaterThanOrEqual(29);
    expect(bsMonthLength(2083, 7)).toBeLessThanOrEqual(32);
  });
});
