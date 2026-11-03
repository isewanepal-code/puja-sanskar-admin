import { describe, expect, it } from 'vitest';

import { routes } from './routes';

describe('routes', () => {
  it('should build record paths from their id', () => {
    expect(routes.order('f692eabf')).toBe('/orders/f692eabf');
  });

  it('should carry where to go back to after sign-in', () => {
    expect(routes.login()).toBe('/login');
    expect(routes.login('/orders?status=PENDING')).toBe('/login?next=%2Forders%3Fstatus%3DPENDING');
  });
});
