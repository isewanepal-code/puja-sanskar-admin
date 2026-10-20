import { describe, expect, it } from 'vitest';

import { formatDate } from './date';

describe('formatDate', () => {
  it("should show a timestamp on the shop's own day", () => {
    // 19:00 UTC is already the next morning in Kathmandu.
    expect(formatDate('2026-11-07T19:00:00Z', 'en')).toBe('8 Nov 2026');
  });

  it('should show a calendar day as that day', () => {
    expect(formatDate('2026-11-08', 'en')).toBe('8 Nov 2026');
  });
});
