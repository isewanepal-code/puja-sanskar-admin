'use client';

import { useQueries } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { request } from '@/lib/api';

type Page = { meta: { total: number } };

// Under "Add a whole category": how many items that really adds. A category is easy to pick without
// meaning every item in it, so the number is shown before anything is saved.
export function CategoryPreview({ ids }: { ids: unknown }) {
  const t = useTranslations('groupForm');
  const chosen = Array.isArray(ids) ? ids.map(String) : [];
  const counts = useQueries({
    queries: chosen.map((id) => ({
      queryKey: ['group-category-count', id],
      queryFn: () =>
        request<Page>('GET', '/admin/products', { query: { categoryId: id, limit: 1 } }),
      staleTime: 30_000,
    })),
  });
  if (chosen.length === 0) return null;
  const total = counts.reduce((sum, c) => sum + (c.data?.meta.total ?? 0), 0);
  const loading = counts.some((c) => c.isPending);
  return (
    <p
      role="status"
      className="mt-2 rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm"
    >
      {loading ? t('categoryChecking') : t('categoryAdds', { count: total })}
    </p>
  );
}
