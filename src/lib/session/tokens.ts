import 'server-only';

import { cookieOptions, SESSION_COOKIES } from './cookies';

export interface SessionTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

// Anything with Next's cookie setter: cookies() in a route handler, or a response's cookies.
interface CookieWriter {
  set(name: string, value: string, options: ReturnType<typeof cookieOptions>): unknown;
  delete(name: string): unknown;
}

export function writeTokens(jar: CookieWriter, tokens: SessionTokens): void {
  jar.set(
    SESSION_COOKIES.access,
    tokens.accessToken,
    cookieOptions(new Date(tokens.accessTokenExpiresAt)),
  );
  jar.set(
    SESSION_COOKIES.refresh,
    tokens.refreshToken,
    cookieOptions(new Date(tokens.refreshTokenExpiresAt)),
  );
}

export function clearTokens(jar: CookieWriter): void {
  jar.delete(SESSION_COOKIES.access);
  jar.delete(SESSION_COOKIES.refresh);
}

const EARLY_MS = 30_000;

// Read the token's own expiry without verifying it; the API verifies.
export function isExpiring(accessToken: string | undefined, now = Date.now()): boolean {
  if (!accessToken) return true;
  try {
    const [, payload] = accessToken.split('.');
    const { exp } = JSON.parse(Buffer.from(payload ?? '', 'base64url').toString()) as {
      exp?: number;
    };
    return !exp || exp * 1000 - EARLY_MS <= now;
  } catch {
    return true;
  }
}
