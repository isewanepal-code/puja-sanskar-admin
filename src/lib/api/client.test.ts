import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { apiClient } from './client';
import { ApiError } from './errors';

const itemSchema = z.object({ id: z.string() });

function mockFetch(body: unknown, init: ResponseInit = { status: 200 }) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), init));

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

async function captureError(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error;
  }

  throw new Error('Expected promise to reject');
}

describe('apiClient', () => {
  it('returns validated data from a success envelope', async () => {
    mockFetch({ success: true, message: 'OK', data: { id: '1' } });

    await expect(apiClient('/items/1', { schema: itemSchema })).resolves.toEqual({ id: '1' });
  });

  it('serializes the body and sets JSON headers', async () => {
    const fetchMock = mockFetch({ success: true, message: 'Created', data: { id: '1' } });

    await apiClient('/items', { method: 'POST', body: { name: 'Diyo' }, schema: itemSchema });

    const [, init] = fetchMock.mock.calls[0];

    expect(init.body).toBe(JSON.stringify({ name: 'Diyo' }));
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('maps an error envelope to ApiError', async () => {
    mockFetch(
      {
        success: false,
        message: 'Not found',
        error: { code: 'NOT_FOUND', details: [] },
      },
      { status: 404 },
    );

    const error = await captureError(apiClient('/items/2', { schema: itemSchema }));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: 'Not found', status: 404, code: 'NOT_FOUND' });
  });

  it('reports network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiClient('/items', { schema: itemSchema })).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('rejects data that does not match the schema', async () => {
    mockFetch({ success: true, message: 'OK', data: { id: 1 } });

    await expect(apiClient('/items/1', { schema: itemSchema })).rejects.toMatchObject({
      code: 'INVALID_DATA',
    });
  });

  it('rejects non-JSON responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html />', { status: 502 })));

    await expect(apiClient('/items', { schema: itemSchema })).rejects.toMatchObject({
      status: 502,
      code: 'INVALID_RESPONSE',
    });
  });
});
