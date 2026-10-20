import type { Locale } from '@/i18n/routing';

import { localDigits } from './digits';

// "1250.00" from the API → "रु १,२५०" / "Rs 1,250"; paisa only when there are any.
// The string is regrouped, never parsed into a float.
export function formatMoney(amount: string, locale: Locale): string {
  const negative = amount.startsWith('-');
  const [whole = '0', fraction = ''] = amount.replace('-', '').split('.');
  const paisa = fraction.padEnd(2, '0').slice(0, 2);
  const grouped = groupIndian(whole.replace(/^0+(?=\d)/, ''));
  const value = paisa === '00' ? grouped : `${grouped}.${paisa}`;
  const text = `${locale === 'ne' ? 'रु' : 'Rs'} ${negative ? '−' : ''}${value}`;
  return localDigits(text, locale);
}

// Lakh and crore grouping: 12,34,567.
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last}`;
}
