import 'server-only';

import createClient from 'openapi-fetch';
import { cookies } from 'next/headers';

import { serverEnv } from '@/lib/env/server';
import { BRANCH_COOKIE, SESSION_COOKIES } from '@/lib/session/cookies';

import type { paths } from './schema';

// Catalogue reads, cached as the API caches them; nothing personal is sent.
export const publicApi = createClient<paths>({
  baseUrl: serverEnv.API_URL,
  redirect: 'manual',
});

export const cachedFor = (seconds: number) => ({
  fetch: (request: Request) => fetch(request, { next: { revalidate: seconds } }),
});

// Calls as the signed-in customer (or their guest cart); never cached.
export async function sessionApi() {
  const jar = await cookies();
  const access = jar.get(SESSION_COOKIES.access)?.value;
  const cart = jar.get(SESSION_COOKIES.guestCart)?.value;
  const branch = jar.get(BRANCH_COOKIE)?.value;
  return createClient<paths>({
    baseUrl: serverEnv.API_URL,
    redirect: 'manual',
    cache: 'no-store',
    headers: {
      ...(access && { Authorization: `Bearer ${access}` }),
      ...(cart && { 'X-Cart-Token': cart }),
      ...(branch && { 'X-Branch': branch }),
    },
  });
}
