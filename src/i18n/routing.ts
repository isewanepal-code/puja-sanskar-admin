import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ne', 'en'],
  defaultLocale: 'ne',
  localePrefix: 'as-needed',
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
