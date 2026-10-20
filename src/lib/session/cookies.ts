import { siteConfig } from '@/config/site';

const prefix = siteConfig.cookiePrefix;

// Only the server reads these; browser JavaScript never sees a token.
export const SESSION_COOKIES = {
  access: `${prefix}_at`,
  refresh: `${prefix}_rt`,
  guestCart: `${prefix}_cart`,
} as const;

export const cookieOptions = (expires: Date) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  expires,
});

// Guest carts live 30 days untouched on the API side.
export const GUEST_CART_DAYS = 30;
