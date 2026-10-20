import { describe, expect, it } from 'vitest';

import { unwrap, unwrapEmpty } from './unwrap';

const ok = (data: unknown) => Promise.resolve({ data: { data }, response: new Response(null) });

describe('unwrap', () => {
  it('should hand back what is inside the envelope', async () => {
    await expect(unwrap(ok({ id: 'kapur' }))).resolves.toEqual({ id: 'kapur' });
  });

  it('should turn an error envelope into an ApiError', async () => {
    const call = Promise.resolve({
      error: { success: false, message: 'x', error: { code: 'CART_EMPTY', details: [] } },
      response: new Response(null, { status: 422 }),
    });
    await expect(unwrap(call)).rejects.toMatchObject({ status: 422, code: 'CART_EMPTY' });
  });

  it('should report a server it cannot reach', async () => {
    await expect(unwrapEmpty(Promise.reject(new TypeError('fetch failed')))).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
    });
  });
});
