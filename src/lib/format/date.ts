import type { Locale } from '@/i18n/routing';

import { localDigits } from './digits';

const SHOP_TIME_ZONE = 'Asia/Kathmandu';

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: Locale, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let found = formatters.get(key);
  if (!found) {
    found = new Intl.DateTimeFormat(locale === 'ne' ? 'ne-NP' : 'en-GB', {
      timeZone: SHOP_TIME_ZONE,
      ...options,
    });
    formatters.set(key, found);
  }
  return found;
}

// An ISO timestamp or a calendar day (YYYY-MM-DD), as the shop's day.
export function formatDate(value: string, locale: Locale): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00+05:45`)
    : new Date(value);
  return localDigits(
    formatter(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date),
    locale,
  );
}

export function formatDateTime(value: string, locale: Locale): string {
  return localDigits(
    formatter(locale, {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value)),
    locale,
  );
}
