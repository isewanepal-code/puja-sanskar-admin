import { describe, expect, it } from 'vitest';

import { formatMoney } from './money';

describe('formatMoney', () => {
  it('should group lakhs and crores and write Nepali digits on Nepali pages', () => {
    expect(formatMoney('1234567.00', 'en')).toBe('Rs 12,34,567');
    expect(formatMoney('1250.00', 'ne')).toBe('रु १,२५०');
  });

  it('should keep paisa only when there are any', () => {
    expect(formatMoney('99.50', 'en')).toBe('Rs 99.50');
    expect(formatMoney('0.00', 'en')).toBe('Rs 0');
  });

  it('should show a negative amount the API sends', () => {
    expect(formatMoney('-12.00', 'en')).toBe('Rs −12');
  });
});
