import type { Choice, ChoiceSource } from './choices';

// The countries the shop works with, kept here in the browser (no table in the database): a brand or
// company stores only the two-letter code. A new country is one more line here.
export const COUNTRIES: ReadonlyArray<{ code: string; en: string; ne: string }> = [
  { code: 'NP', en: 'Nepal', ne: 'नेपाल' },
  { code: 'IN', en: 'India', ne: 'भारत' },
  { code: 'CN', en: 'China', ne: 'चीन' },
  { code: 'BD', en: 'Bangladesh', ne: 'बंगलादेश' },
  { code: 'BT', en: 'Bhutan', ne: 'भुटान' },
  { code: 'LK', en: 'Sri Lanka', ne: 'श्रीलंका' },
  { code: 'PK', en: 'Pakistan', ne: 'पाकिस्तान' },
  { code: 'TH', en: 'Thailand', ne: 'थाइल्यान्ड' },
  { code: 'ID', en: 'Indonesia', ne: 'इन्डोनेसिया' },
  { code: 'AE', en: 'United Arab Emirates', ne: 'संयुक्त अरब इमिरेट्स' },
  { code: 'US', en: 'United States', ne: 'अमेरिका' },
  { code: 'GB', en: 'United Kingdom', ne: 'बेलायत' },
];

// "नेपाल · Nepal" in either language, or the bare code for one not on the list.
export function countryLabel(code: string | null | undefined): string {
  if (!code) return '';
  const country = COUNTRIES.find((c) => c.code === code);
  return country ? `${country.ne} · ${country.en}` : code;
}

const choices: Choice[] = COUNTRIES.map((c) => ({
  value: c.code,
  label: `${c.ne} · ${c.en}`,
  detail: c.code,
}));

export const countryChoices: ChoiceSource = {
  key: 'countries',
  load: async () => choices,
};
