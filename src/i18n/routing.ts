import { defineRouting } from 'next-intl/routing';

// English only, with no prefix; adding Nepali later is a locale here and a messages file.
export const routing = defineRouting({
  locales: ['en'],
  defaultLocale: 'en',
  localePrefix: 'never',
  localeDetection: false,
});

// The shared formatters speak both of the website's languages.
export type Locale = 'ne' | 'en';
