// Nepali is often spelled two ways: short and long vowels (इ ई, ि ी, उ ऊ, ु ू), the three sibilants
// (श ष स), the nasal marks (ँ ं) and ण/न. For searching, each pair is folded to one letter on both sides,
// so either spelling finds the other. The API does the same for lists it searches.
const FROM = 'ीूईऊँषशण';
const TO = 'िुइउंससन';

export function foldNepali(text: string): string {
  let out = '';
  for (const ch of text.normalize('NFC')) {
    const at = FROM.indexOf(ch);
    out += at === -1 ? ch : TO[at]!;
  }
  return out;
}

// Lower-cased and folded: what a search compares.
export const searchKey = (text: string) => foldNepali(text.toLowerCase());
