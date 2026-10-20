import { NextResponse, type NextRequest } from 'next/server';

import { serverEnv } from '@/lib/env/server';
import {
  clearTokens,
  refreshOnce,
  SESSION_COOKIES,
  writeTokens,
  type SessionTokens,
} from '@/lib/session';

// What each sign-in posts to; the body passes through as the customer typed it.
const SIGN_IN: Record<string, string> = {
  login: 'auth/customers/login',
  signup: 'auth/customers/signup',
  google: 'auth/customers/google',
  facebook: 'auth/customers/facebook',
};

const api = (path: string, body: unknown, headers: HeadersInit = {}) =>
  fetch(`${serverEnv.API_URL}/api/v1/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

// After signing in, the guest cart joins the customer's own; it never blocks the sign-in.
async function mergeGuestCart(request: NextRequest, accessToken: string): Promise<boolean> {
  const guestToken = request.cookies.get(SESSION_COOKIES.guestCart)?.value;
  if (!guestToken) return false;
  await api('carts/mine/merge', { guestToken }, { Authorization: `Bearer ${accessToken}` }).catch(
    () => undefined,
  );
  return true;
}

export async function POST(request: NextRequest, { params }: RouteContext<'/api/auth/[action]'>) {
  const { action } = await params;

  if (action === 'logout') {
    const refreshToken = request.cookies.get(SESSION_COOKIES.refresh)?.value;
    if (refreshToken) await api('auth/logout', { refreshToken }).catch(() => undefined);
    const response = new NextResponse(null, { status: 204 });
    clearTokens(response.cookies);
    return response;
  }

  const target = SIGN_IN[action];
  if (!target) return NextResponse.json({ success: false }, { status: 404 });

  const upstream = await api(target, await request.json());
  const payload = (await upstream.json()) as {
    data?: SessionTokens & { user: unknown };
  };
  if (!upstream.ok || !payload.data) return NextResponse.json(payload, { status: upstream.status });

  const { user, ...tokens } = payload.data;
  const response = NextResponse.json({
    success: true,
    message: 'Signed in',
    data: { user },
  });
  writeTokens(response.cookies, tokens);
  if (await mergeGuestCart(request, tokens.accessToken)) {
    response.cookies.delete(SESSION_COOKIES.guestCart);
  }
  return response;
}

// Server-rendered pages send an expired session here; it refreshes once and goes back.
export async function GET(request: NextRequest, { params }: RouteContext<'/api/auth/[action]'>) {
  const { action } = await params;
  const next = request.nextUrl.searchParams.get('next') ?? '/';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  if (action !== 'refresh') return NextResponse.json({ success: false }, { status: 404 });

  const refreshToken = request.cookies.get(SESSION_COOKIES.refresh)?.value;
  const tokens = refreshToken ? await refreshOnce(refreshToken) : null;
  const response = NextResponse.redirect(
    new URL(tokens ? safeNext : `/login?next=${encodeURIComponent(safeNext)}`, request.url),
  );
  if (tokens) writeTokens(response.cookies, tokens);
  else clearTokens(response.cookies);
  return response;
}
