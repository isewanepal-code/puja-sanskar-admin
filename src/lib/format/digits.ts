import type { Locale } from '@/i18n/routing';

const DEVANAGARI = '०१२३४५६७८९';

// Nepali pages write numbers in Devanagari digits.
export const localDigits = (text: string, locale: Locale) =>
  locale === 'ne' ? text.replace(/[0-9]/g, (d) => DEVANAGARI[Number(d)]!) : text;
