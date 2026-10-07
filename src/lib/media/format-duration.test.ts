import { describe, expect, it } from 'vitest';

import { formatDuration } from './format-duration';

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [9, '0:09'],
    [65.8, '1:05'],
    [3600, '1:00:00'],
    [3725, '1:02:05'],
  ])('formats %s seconds as %s', (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -5])('falls back to 0:00 for %s', (input) => {
    expect(formatDuration(input)).toBe('0:00');
  });
});
