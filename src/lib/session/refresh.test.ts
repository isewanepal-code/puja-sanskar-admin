import { describe, expect, it, vi } from 'vitest';

import { refreshOnce } from './refresh';

describe('refreshOnce', () => {
  it('should spend a refresh token once, however many requests ask', async () => {
    const tokens = { accessToken: 'a2', refreshToken: 'r2' };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: tokens }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const answers = await Promise.all([refreshOnce('r1'), refreshOnce('r1'), refreshOnce('r1')]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(answers).toEqual([tokens, tokens, tokens]);
    await expect(refreshOnce('r1')).resolves.toEqual(tokens);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should answer null when the API refuses the token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));

    await expect(refreshOnce('stolen')).resolves.toBeNull();
  });
});
