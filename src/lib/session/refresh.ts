import 'server-only';

import { serverEnv } from '@/lib/env/server';

import type { SessionTokens } from './tokens';

// The API ends every session when an old refresh token comes back, so each one is spent once:
// concurrent requests share the refresh in flight, and its answer is kept briefly for stragglers.
const KEEP_MS = 30_000;
const flights = new Map<string, Promise<SessionTokens | null>>();

async function exchange(refreshToken: string): Promise<SessionTokens | null> {
  try {
    const response = await fetch(`${serverEnv.API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const { data } = (await response.json()) as { data: SessionTokens };
    return data;
  } catch {
    return null;
  }
}

export function refreshOnce(refreshToken: string): Promise<SessionTokens | null> {
  const flying = flights.get(refreshToken);
  if (flying) return flying;
  const flight = exchange(refreshToken);
  flights.set(refreshToken, flight);
  void flight.finally(() => setTimeout(() => flights.delete(refreshToken), KEEP_MS));
  return flight;
}
