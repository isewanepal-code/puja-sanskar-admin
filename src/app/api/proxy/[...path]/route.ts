import { NextResponse, type NextRequest } from 'next/server';

import { serverEnv } from '@/lib/env/server';
import {
  clearTokens,
  isExpiring,
  refreshOnce,
  BRANCH_COOKIE,
  SESSION_COOKIES,
  writeTokens,
  type SessionTokens,
} from '@/lib/session';

const FORWARDED_HEADERS = ['content-type', 'accept', 'idempotency-key', 'accept-language'];

const allowed = (path: string) => path.startsWith('api/v1/');

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
  // A screen may name a branch itself; otherwise the one chosen in the header.
  const branch = request.headers.get('x-branch') ?? request.cookies.get(BRANCH_COOKIE)?.value;
  if (branch) headers.set('X-Branch', branch);
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

  const response = await relay(upstream);
  if (refreshed) writeTokens(response.cookies, refreshed);
  else if (refreshed === null) clearTokens(response.cookies);
  return response;
}

async function relay(upstream: Response): Promise<NextResponse> {
  const contentType = upstream.headers.get('content-type') ?? '';
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
