import { getPathname } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { clientEnv } from '@/lib/env';

export function getCanonicalUrl(locale: Locale, pathname = '/'): string {
  const href = pathname.startsWith('/') ? pathname : `/${pathname}`;

  return new URL(getPathname({ locale, href }), clientEnv.NEXT_PUBLIC_SITE_URL).toString();
}

export function getLanguageAlternates(pathname = '/'): Record<string, string> {
  return {
    ...Object.fromEntries(
      routing.locales.map((locale) => [locale, getCanonicalUrl(locale, pathname)]),
    ),
    'x-default': getCanonicalUrl(routing.defaultLocale, pathname),
  };
}
