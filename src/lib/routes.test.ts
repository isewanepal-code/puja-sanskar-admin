import { describe, expect, it } from 'vitest';

import { routes } from './routes';

describe('routes', () => {
  it('should build the paths the API links to', () => {
    expect(routes.product('kapur')).toBe('/products/kapur');
    expect(routes.pay('t0k3n')).toBe('/pay/t0k3n');
    expect(routes.listRequest('abc')).toBe('/lists/abc');
  });

  it('should carry where to go back after signing in', () => {
    expect(routes.login('/checkout?step=2')).toBe('/login?next=%2Fcheckout%3Fstep%3D2');
  });
});
