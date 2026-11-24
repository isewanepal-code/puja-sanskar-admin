import type { Schema } from '@/lib/api';

type Variant = Schema<'AdminVariantResponse'>;

// What one way of selling the item is called: its colours and sizes, else its amount (1 set, 50 g).
export const nameOf = (v: Variant) =>
  v.options.length ? v.options.map((o) => o.valueEn).join(' · ') : v.label;
