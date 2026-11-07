import { describe, expect, it } from 'vitest';

import { addDays, changeOf, parseRange, periodsFor, shopToday } from './periods';

describe('dashboard periods', () => {
  it('takes the last N days and the N before them, with no overlap', () => {
    expect(periodsFor(7, '2026-11-07')).toEqual({
      current: { from: '2026-11-01', to: '2026-11-07' },
      previous: { from: '2026-10-25', to: '2026-10-31' },
    });
  });

  it('crosses month and year ends', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(periodsFor(30, '2026-03-01').previous.to).toBe('2026-01-30');
  });

  it('counts the day in Kathmandu, which is ahead of UTC', () => {
    // 19:00 UTC on the 6th is already the 7th at 00:45 in Nepal.
    expect(shopToday(new Date('2026-11-06T19:00:00Z'))).toBe('2026-11-07');
  });

  it('falls back to 30 days for anything else', () => {
    expect(parseRange('7')).toBe(7);
    expect(parseRange('90')).toBe(90);
    expect(parseRange('12')).toBe(30);
    expect(parseRange(undefined)).toBe(30);
  });

  it('measures change, and says so when there is nothing to compare with', () => {
    expect(changeOf(150, 100)).toBe(50);
    expect(changeOf(50, 100)).toBe(-50);
    expect(changeOf(0, 0)).toBe(0);
    expect(changeOf(10, 0)).toBeNull();
  });
});
