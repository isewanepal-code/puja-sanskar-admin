import { z } from 'zod';

import type { Field } from './types';

// What the API checks, checked first in the browser so mistakes show beside the field.
const PATTERN: Partial<Record<Field['kind'], { regex: RegExp; message: string }>> = {
  code: {
    regex: /^[A-Z][A-Z0-9_]{1,31}$/,
    message: 'Start with a capital letter; use A–Z, 0–9 or _',
  },
  slug: {
    regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    message: 'Lower-case words joined by hyphens',
  },
  money: { regex: /^\d{1,13}(\.\d{1,2})?$/, message: 'An amount such as 450 or 450.50' },
  percent: { regex: /^\d{1,3}(\.\d{1,2})?$/, message: 'A percentage such as 10 or 12.5' },
  number: { regex: /^-?\d+$/, message: 'A whole number' },
  url: { regex: /^https?:\/\/\S+$/, message: 'A web address starting with https://' },
  time: { regex: /^([01]\d|2[0-3]):[0-5]\d$/, message: 'A time such as 09:30' },
};

export type FormValues = Record<string, string | boolean | string[]>;

function fieldSchema(field: Field): z.ZodType {
  if (field.kind === 'switch') return z.boolean();
  if (field.kind === 'multiselect') {
    const list = z.array(z.string());
    return field.required ? list.min(1, 'Pick at least one') : list;
  }
  let text = z.string().trim();
  if (field.max) text = text.max(field.max, `At most ${field.max} characters`);
  const pattern = field.pattern ?? PATTERN[field.kind];
  const shaped = pattern ? text.regex(pattern.regex, pattern.message) : text;
  return field.required
    ? z.string().trim().min(1, 'Required').pipe(shaped)
    : z.union([z.literal(''), shaped]);
}

// One zod schema per form, made from the fields so the rules are written once.
export function schemaFor(fields: Field[]) {
  return z.object(Object.fromEntries(fields.map((field) => [field.name, fieldSchema(field)])));
}

const pad = (n: number) => String(n).padStart(2, '0');

// A stored instant as the browser's datetime-local value.
function localDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// A record as the form shows it: every value a string, a switch or a list.
export function toFormValues(fields: Field[], row?: Record<string, unknown>): FormValues {
  return Object.fromEntries(
    fields.map((field) => {
      const value = row?.[field.name];
      if (field.kind === 'switch') {
        return [field.name, typeof value === 'boolean' ? value : (field.defaultValue ?? true)];
      }
      if (field.kind === 'multiselect') {
        return [field.name, Array.isArray(value) ? value.map(String) : (field.defaultValue ?? [])];
      }
      if (field.codec)
        return [field.name, value === null || value === undefined ? '' : field.codec.toText(value)];
      if (value === null || value === undefined) return [field.name, field.defaultValue ?? ''];
      if (field.kind === 'tags' && Array.isArray(value)) return [field.name, value.join(', ')];
      if (field.kind === 'datetime') return [field.name, localDateTime(String(value))];
      if (field.kind === 'date') return [field.name, String(value).slice(0, 10)];
      if (field.kind === 'time') return [field.name, String(value).slice(0, 5)];
      return [field.name, String(value)];
    }),
  );
}

// The form's values as the API takes them. A slug or number left empty is left out;
// any other empty optional field is sent as null, which clears it.
export function toBody(
  fields: Field[],
  values: FormValues,
  mode: 'create' | 'edit',
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const field of fields) {
    if (mode === 'edit' && field.createOnly) continue;
    if (mode === 'create' && field.editOnly) continue;
    const value = values[field.name];
    if (field.codec && typeof value === 'string') {
      body[field.name] = field.codec.fromText(value);
      continue;
    }
    if (typeof value === 'boolean' || Array.isArray(value)) {
      body[field.name] = value;
      continue;
    }
    const text = (value ?? '').trim();
    if (text === '') {
      if (field.kind === 'slug' || field.kind === 'number') continue;
      if (field.kind === 'tags') body[field.name] = [];
      else body[field.name] = field.required ? '' : null;
      continue;
    }
    if (field.kind === 'number') body[field.name] = Number(text);
    else if (field.kind === 'tags')
      body[field.name] = text
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    else if (field.kind === 'datetime') body[field.name] = new Date(text).toISOString();
    else body[field.name] = text;
  }
  return body;
}
