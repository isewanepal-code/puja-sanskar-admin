import { useSyncExternalStore } from 'react';

// A kit that cannot go on sale because compulsory items are not in stock: the list the API sent, shown by
// one dialog wherever the kit was being switched on.
export type ShortItem = {
  variantId: string;
  productId: string;
  sku: string;
  label: string;
  nameNe: string;
  nameEn: string;
  needed: number;
  available: number;
  onSale: boolean;
};

let current: { items: ShortItem[]; back: string } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const shortStock = {
  show(items: ShortItem[], back: string) {
    current = { items, back };
    emit();
  },
  close() {
    current = null;
    emit();
  },
};

export function useShortStock() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => null,
  );
}
