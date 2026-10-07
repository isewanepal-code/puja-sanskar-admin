import { siteConfig } from '@/config/site';

export const AUTH_COOKIE_NAMES = {
  accessToken: `${siteConfig.cookiePrefix}_access_token`,
  refreshToken: `${siteConfig.cookiePrefix}_refresh_token`,
} as const;
