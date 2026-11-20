import { siteConfig } from '@/config/site';

const prefix = siteConfig.cookiePrefix;

// Only the server reads these; browser JavaScript never sees a token.
export const SESSION_COOKIES = {
  access: `${prefix}_at`,
  refresh: `${prefix}_rt`,
  guestCart: `${prefix}_cart`,
} as const;

// The branch staff are working in (its code); the browser sets it, every API call carries it.
export const BRANCH_COOKIE = `${prefix}_branch`;

// "on" while staff work in test mode (staging only): every API call then carries X-Test-Mode: on,
// and the API, if this server allows it, lets in-use things be deleted.
export const TEST_MODE_COOKIE = `${prefix}_test_mode`;

export const cookieOptions = (expires: Date) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  expires,
});

// Guest carts live 30 days untouched on the API side.
export const GUEST_CART_DAYS = 30;
