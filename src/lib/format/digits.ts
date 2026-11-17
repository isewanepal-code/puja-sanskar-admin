import type { Locale } from '@/i18n/routing';

const DEVANAGARI = '०१२३४५६७८९';

// Nepali pages write numbers in Devanagari digits.
export const localDigits = (text: string, locale: Locale) =>
  locale === 'ne' ? text.replace(/[0-9]/g, (d) => DEVANAGARI[Number(d)]!) : text;

// A quantity as people say it: 12, 1.5, 0.35 (never 1.500).
export const formatQuantity = (value: number): string => String(Number(value.toFixed(3)));
