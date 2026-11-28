'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { request } from '@/lib/api';

import { groupKitSets, kitSetKey, type Kit } from '../lib/kit-set';
import { KitSetEditor } from './kit-set-editor';

// A saved kit as the same page that made it: its packages and their items, to change and save.
export function KitSetPage({ id }: { id: string }) {
  const t = useTranslations('kitEdit');
  const kit = useQuery({
    queryKey: ['kits', 'page', id],
    queryFn: () => request<Kit>('GET', `/admin/kits/${id}`),
  });
  const key = kit.data ? kitSetKey(kit.data) : null;
  const set = useQuery({
    queryKey: ['kits', 'set', key],
    enabled: key !== null,
    queryFn: async () => {
      const { items } = await request<{ items: Kit[] }>('GET', '/admin/kits', {
        query: { q: key, limit: 100 },
      });
      const found = groupKitSets(items).find((s) => s.key === key)?.kits ?? [];
      return found.length > 0 ? found : [kit.data!];
    },
  });

  if (kit.isPending || (key !== null && set.isPending)) {
    return <p className="text-sm text-muted-foreground">…</p>;
  }
  if (kit.isError || !set.data) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t('notFound')}
      </p>
    );
  }
  // A fresh load of the set starts the page over, so it shows what was saved.
  return <KitSetEditor key={set.dataUpdatedAt} existing={set.data} />;
}
