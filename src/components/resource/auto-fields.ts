import { autoCode } from '@/lib/auto-code';

import type { Field } from './types';

// A code field of a new record is made for it, never typed.
export const isAutoField = (field: Field) =>
  field.kind === 'code' && (field.name === 'code' || field.auto !== undefined);

// Adds a made code for each of these fields to a body. The name it comes from is the first of
// these that has English letters.
export function withAutoCodes(
  resourceKey: string,
  autoFields: readonly Field[],
  values: Record<string, unknown>,
  body: Record<string, unknown>,
): Record<string, unknown> {
  if (autoFields.length === 0) return body;
  const source = ['nameEn', 'name', 'title', 'label', 'symbol', 'fullName']
    .map((key) => String(values[key] ?? ''))
    .find((text) => /[A-Za-z]/.test(text));
  const made = Object.fromEntries(
    autoFields.map((field) => [
      field.name,
      autoCode({
        from: source,
        fallback:
          field.auto?.prefix ??
          (resourceKey
            .replace(/[^A-Za-z]/g, '')
            .slice(0, 4)
            .toUpperCase() ||
            'ITEM'),
        max: field.max ?? 32,
        separator: field.auto?.separator,
      }),
    ]),
  );
  return { ...body, ...made };
}
