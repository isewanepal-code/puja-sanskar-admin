import { defineRouting } from 'next-intl/routing';

// English and Nepali, with no prefix: the chosen language is kept in the NEXT_LOCALE cookie.
export const routing = defineRouting({
  locales: ['en', 'ne'],
  defaultLocale: 'en',
  localePrefix: 'never',
  // Without a prefix the cookie is how the chosen language is found.
  localeDetection: true,
});

// The shared formatters speak both of the website's languages.
export type Locale = 'ne' | 'en';
