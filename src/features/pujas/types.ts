import type { Schema } from '@/lib/api';

export type Puja = Schema<'AdminPujaResponse'>;
export type PujaKind = Puja['type'];

// The API's own list of kinds, in the order the form offers them.
export const PUJA_KINDS: PujaKind[] = [
  'PUJA',
  'SAMSKARA',
  'HOMA',
  'FESTIVAL',
  'VRAT',
  'SHANTI',
  'SHRADDHA',
  'PATH',
];
