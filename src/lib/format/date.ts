import type { Locale } from '@/i18n/routing';

import { adToBs, BS_MONTHS, parseIsoDay } from './bikram-sambat';
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

const isCalendarDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const toDate = (value: string) =>
  isCalendarDay(value) ? new Date(`${value}T00:00:00+05:45`) : new Date(value);

// The shop's calendar day in Kathmandu, whatever zone the browser is in.
function shopDay(date: Date) {
  const parts = formatter('en', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(date)
    .reduce<Record<string, string>>((all, part) => ({ ...all, [part.type]: part.value }), {});
  return parseIsoDay(`${parts.year}-${parts.month}-${parts.day}`);
}

// "17 Kartik 2083": Nepal's own calendar, as bills and customers read dates.
export function formatBsDate(value: string, locale: Locale, withYear = true): string {
  const bs = adToBs(isCalendarDay(value) ? parseIsoDay(value) : shopDay(new Date(value)));
  const [en, ne] = BS_MONTHS[bs.month - 1]!;
  const text = `${bs.day} ${locale === 'ne' ? ne : en}${withYear ? ` ${bs.year}` : ''}`;
  return localDigits(text, locale);
}

// An ISO timestamp or a calendar day, as the shop's day: Nepali date first, the English one after.
export function formatDate(value: string, locale: Locale): string {
  const ad = formatter(locale, { day: 'numeric', month: 'short' }).format(toDate(value));
  return `${formatBsDate(value, locale)} · ${localDigits(ad, locale)}`;
}

export function formatDateTime(value: string, locale: Locale): string {
  const date = new Date(value);
  const ad = formatter(locale, { day: 'numeric', month: 'short' }).format(date);
  const time = formatter(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
  return `${formatBsDate(value, locale, false)} · ${localDigits(`${ad}, ${time}`, locale)}`;
}
