import { describe, expect, it } from 'vitest';

import { isExpiring } from './tokens';

const token = (exp: number) => `x.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.y`;

describe('isExpiring', () => {
  const now = Date.UTC(2026, 9, 20);

  it('should treat a token close to its end as expiring', () => {
    expect(isExpiring(token(now / 1000 + 600), now)).toBe(false);
    expect(isExpiring(token(now / 1000 + 10), now)).toBe(true);
  });

  it('should treat a missing or unreadable token as expiring', () => {
    expect(isExpiring(undefined, now)).toBe(true);
    expect(isExpiring('not-a-jwt', now)).toBe(true);
  });
});
