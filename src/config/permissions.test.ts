import { describe, expect, it } from 'vitest';

import { navigationFor } from './navigation';
import { can } from './permissions';

describe('can', () => {
  it('should allow what needs no permission, and only what was granted otherwise', () => {
    expect(can([], undefined)).toBe(true);
    expect(can(['orders:read'], 'orders:read')).toBe(true);
    expect(can(['reports:read'], 'orders:read')).toBe(false);
  });

  it('should leave a staff member only the sections and groups they may open', () => {
    const groups = navigationFor(['reports:read']);
    expect(groups.map((group) => group.key)).toEqual(['overview']);
    expect(groups[0]!.sections.map((section) => section.key)).toEqual(['dashboard']);
  });

  it('should show catalogue sections to a content manager', () => {
    const keys = navigationFor(['catalogue:read', 'catalogue:write']).flatMap((group) =>
      group.sections.map((section) => section.key),
    );
    expect(keys).toEqual(['dashboard', 'pujas']);
  });
});
