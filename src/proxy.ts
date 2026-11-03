import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import { routing } from '@/i18n/routing';
import { routes } from '@/lib/routes';
import { isExpiring, SESSION_COOKIES } from '@/lib/session';

const intl = createMiddleware(routing);

const PUBLIC_PATHS = new Set([routes.login()]);

// Every page but sign-in needs a session; an expiring one is refreshed before the page renders.
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!PUBLIC_PATHS.has(pathname)) {
    const here = `${pathname}${search}`;
    const refreshToken = request.cookies.get(SESSION_COOKIES.refresh)?.value;
    if (!refreshToken) return NextResponse.redirect(new URL(routes.login(here), request.url));
    if (isExpiring(request.cookies.get(SESSION_COOKIES.access)?.value)) {
      return NextResponse.redirect(
        new URL(`/api/auth/refresh?next=${encodeURIComponent(here)}`, request.url),
      );
    }
  }
  return intl(request);
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
