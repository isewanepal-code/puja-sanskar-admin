import { useQuery } from '@tanstack/react-query';

import { request, type Schema } from '@/lib/api';

export type Product = Schema<'AdminProductResponse'>;

// The item as it is now: what is changed on one tab shows on the others at once.
export function useProduct(id: string | undefined, initial?: Product) {
  return useQuery({
    queryKey: ['products', 'one', id],
    queryFn: () => request<Product>('GET', `/admin/products/${id}`),
    enabled: !!id,
    initialData: initial,
  });
}
