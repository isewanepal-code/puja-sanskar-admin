import { NextResponse, type NextRequest } from 'next/server';

import { serverEnv } from '@/lib/env/server';
import {
  clearTokens,
  cookieOptions,
  GUEST_CART_DAYS,
  isExpiring,
  refreshOnce,
  SESSION_COOKIES,
  writeTokens,
  type SessionTokens,
} from '@/lib/session';

const FORWARDED_HEADERS = ['content-type', 'accept', 'idempotency-key', 'accept-language'];
const DAY_MS = 86_400_000;

// The admin panel is its own app; the website never reaches staff routes.
const allowed = (path: string) => path.startsWith('api/v1/') && !path.startsWith('api/v1/admin/');

const notFound = () =>
  NextResponse.json(
    { success: false, message: 'Not found', error: { code: 'NOT_FOUND', details: [] } },
    { status: 404 },
  );

async function forward(
  request: NextRequest,
  path: string,
  body: ArrayBuffer | undefined,
  access?: string,
) {
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (access) headers.set('Authorization', `Bearer ${access}`);
  const cart = request.cookies.get(SESSION_COOKIES.guestCart)?.value;
  if (cart) headers.set('X-Cart-Token', cart);
  const ip = request.headers.get('x-forwarded-for');
  if (ip) headers.set('X-Forwarded-For', ip);

  return fetch(`${serverEnv.API_URL}/${path}${request.nextUrl.search}`, {
    method: request.method,
    headers,
    body,
    cache: 'no-store',
    redirect: 'manual',
  });
}

const tokenInvalid = async (response: Response) =>
  response.status === 401 &&
  (
    (await response
      .clone()
      .json()
      .catch(() => null)) as { error?: { code?: string } } | null
  )?.error?.code === 'AUTH_TOKEN_INVALID';

async function handle(request: NextRequest, { params }: RouteContext<'/api/proxy/[...path]'>) {
  const path = (await params).path.join('/');
  if (!allowed(path)) return notFound();

  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();
  const refreshToken = request.cookies.get(SESSION_COOKIES.refresh)?.value;
  let access = request.cookies.get(SESSION_COOKIES.access)?.value;
  let refreshed: SessionTokens | null | undefined;

  if (refreshToken && isExpiring(access)) {
    refreshed = await refreshOnce(refreshToken);
    access = refreshed?.accessToken;
  }
  let upstream = await forward(request, path, body, access);
  if (refreshToken && refreshed === undefined && (await tokenInvalid(upstream))) {
    refreshed = await refreshOnce(refreshToken);
    if (refreshed) upstream = await forward(request, path, body, refreshed.accessToken);
  }

  const response = await relay(upstream, path, request.method);
  if (refreshed) writeTokens(response.cookies, refreshed);
  else if (refreshed === null) clearTokens(response.cookies);
  return response;
}

// A new guest cart's token goes into an httpOnly cookie, never to the page.
async function relay(upstream: Response, path: string, method: string): Promise<NextResponse> {
  const contentType = upstream.headers.get('content-type') ?? '';
  if (method === 'POST' && path === 'api/v1/guest-cart' && upstream.ok) {
    const { data, ...envelope } = (await upstream.json()) as {
      data: { token: string; cart: unknown };
    };
    const response = NextResponse.json(
      { ...envelope, data: { cart: data.cart } },
      { status: upstream.status },
    );
    response.cookies.set(
      SESSION_COOKIES.guestCart,
      data.token,
      cookieOptions(new Date(Date.now() + GUEST_CART_DAYS * DAY_MS)),
    );
    return response;
  }
  const headers = new Headers();
  for (const name of ['content-type', 'content-disposition', 'cache-control', 'retry-after']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!contentType) headers.set('cache-control', 'no-store');
  return new NextResponse(upstream.status === 204 ? null : await upstream.arrayBuffer(), {
    status: upstream.status,
    headers,
  });
}

export { handle as DELETE, handle as GET, handle as PATCH, handle as POST, handle as PUT };
