'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { SearchSelect } from '@/components/controls';
import { useToast } from '@/components/overlays';
import { isApiError, request, type Schema } from '@/lib/api';

import { priceGroups } from '../offers';

type Groups = Schema<'ItemGroupsResponse'>;

// The groups one item or kit is in, changed in one place: pick groups to put it in, take a chip away to
// take it out. Saved as soon as it changes, so there is nothing to forget.
export function ItemGroups({ kind, id }: { kind: 'product' | 'kit'; id: string }) {
  const t = useTranslations('itemGroups');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const path = `/admin/price-groups/of/${kind}/${id}`;
  const current = useQuery({
    queryKey: ['priceGroups', 'of', kind, id],
    queryFn: () => request<Groups>('GET', path),
  });
  const save = useMutation({
    mutationFn: (groupIds: string[]) => request<Groups>('PUT', path, { body: { groupIds } }),
    onSuccess: async (next) => {
      queryClient.setQueryData(['priceGroups', 'of', kind, id], next);
      toast.success(t('saved'));
      await queryClient.invalidateQueries({ queryKey: ['priceGroups'] });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });
  const groups = current.data?.groups ?? [];

  return (
    <div className="grid gap-2">
      <SearchSelect
        multiple
        source={priceGroups}
        value={groups.map((g) => g.id)}
        known={groups.map((g) => ({ value: g.id, label: g.name, detail: g.code }))}
        disabled={current.isPending || save.isPending}
        placeholder={t('none')}
        aria-label={t('title')}
        onChange={(next) => save.mutate((Array.isArray(next) ? next : [next]).map(String))}
      />
      <p className="text-xs text-muted-foreground">{t('note')}</p>
    </div>
  );
}
