const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const randomEnd = (length = 4) => {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
};

// A code for a new record, made from its English name so staff never type one:
// "Teej samagri" -> TEEJ_SAMAGRI_7K2F. Names with no English letters fall back on `fallback`.
export function autoCode({
  from,
  fallback,
  max = 32,
  separator = '_',
}: {
  from?: string;
  fallback: string;
  max?: number;
  separator?: '_' | '-';
}): string {
  const words = (from ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, separator)
    .replace(new RegExp(`^\\${separator}+|\\${separator}+$`, 'g'), '');
  const start = /^[A-Z]/.test(words) ? words : [fallback, words].filter(Boolean).join(separator);
  const end = randomEnd();
  return `${start.slice(0, Math.max(1, max - end.length - 1))}${separator}${end}`;
}
