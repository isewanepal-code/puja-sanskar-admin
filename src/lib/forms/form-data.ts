// Reads a submitted form the way the API wants it: trimmed text, empty as null.
export function text(form: FormData, name: string): string | null {
  const value = String(form.get(name) ?? '').trim();
  return value === '' ? null : value;
}

export const required = (form: FormData, name: string) => text(form, name) ?? '';

export const checked = (form: FormData, name: string) => form.get(name) === 'on';

export const whole = (form: FormData, name: string) => Number(text(form, name) ?? 0);
