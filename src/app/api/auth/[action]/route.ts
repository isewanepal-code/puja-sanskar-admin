import { NextResponse, type NextRequest } from 'next/server';

import { serverEnv } from '@/lib/env/server';
import {
  clearTokens,
  refreshOnce,
  SESSION_COOKIES,
  writeTokens,
  type SessionTokens,
} from '@/lib/session';

const api = (path: string, body: unknown) =>
  fetch(`${serverEnv.API_URL}/api/v1/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

export async function POST(request: NextRequest, { params }: RouteContext<'/api/auth/[action]'>) {
  const { action } = await params;

  if (action === 'logout') {
    const refreshToken = request.cookies.get(SESSION_COOKIES.refresh)?.value;
    if (refreshToken) await api('auth/logout', { refreshToken }).catch(() => undefined);
    const response = new NextResponse(null, { status: 204 });
    clearTokens(response.cookies);
    return response;
  }

  if (action !== 'login') return NextResponse.json({ success: false }, { status: 404 });

  // Staff sign in with email and password; the body passes through as typed.
  const upstream = await api('auth/login', await request.json());
  const payload = (await upstream.json()) as {
    data?: SessionTokens & { user: unknown };
  };
  if (!upstream.ok || !payload.data) return NextResponse.json(payload, { status: upstream.status });

  const { user, ...tokens } = payload.data;
  const response = NextResponse.json({ success: true, message: 'Signed in', data: { user } });
  writeTokens(response.cookies, tokens);
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
