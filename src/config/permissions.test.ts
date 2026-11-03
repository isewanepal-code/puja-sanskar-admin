import { describe, expect, it } from 'vitest';

import { navigation } from './navigation';
import { can } from './permissions';

describe('can', () => {
  it('should allow what needs no permission, and only what was granted otherwise', () => {
    expect(can([], undefined)).toBe(true);
    expect(can(['orders:read'], 'orders:read')).toBe(true);
    expect(can(['reports:read'], 'orders:read')).toBe(false);
  });

  it('should leave a staff member without orders:read a sidebar of the dashboard alone', () => {
    const shown = navigation.filter((section) => can(['reports:read'], section.permission));
    expect(shown.map((section) => section.key)).toEqual(['dashboard']);
  });
});
