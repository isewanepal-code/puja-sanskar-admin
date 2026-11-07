// What the counter sells: one pack of an item, or a whole kit, with the price it goes at.
export type Pack = {
  // Unique across both kinds: the pack's or kit's id.
  id: string;
  kind: 'pack' | 'kit';
  name: string;
  // The other language, and the pack size or tier.
  detail: string;
  code: string;
  price: string;
  // The price before a kit's own discount, shown struck through.
  listPrice?: string;
  image?: string;
};

export type Line = Pack & { quantity: number };

export type SaleForm = {
  contactName: string;
  contactPhone: string;
  couponCode: string;
  discountKind: 'PERCENT' | 'FLAT';
  discountValue: string;
  discountReason: string;
  note: string;
};

export const EMPTY_FORM: SaleForm = {
  contactName: '',
  contactPhone: '',
  couponCode: '',
  discountKind: 'PERCENT',
  discountValue: '',
  discountReason: '',
  note: '',
};

// What the discount takes off, as far as the screen can tell; the server has the last word.
export function discountOf(subtotal: number, form: SaleForm): number {
  const value = Number(form.discountValue);
  if (!form.discountValue || !Number.isFinite(value) || value <= 0) return 0;
  const off = form.discountKind === 'PERCENT' ? (subtotal * Math.min(value, 100)) / 100 : value;
  return Math.min(off, subtotal);
}
