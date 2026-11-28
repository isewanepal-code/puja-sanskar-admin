'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { ConfirmDialog, useToast } from '@/components/overlays';
import { ResourceScreen, useResourceText } from '@/components/resource';
import { IconButton } from '@/components/ui/button';
import { priceGroups } from '@/features/marketing';
import { isApiError, request } from '@/lib/api';
import { routes } from '@/lib/routes';

import { kitsResource } from '../resources';
import { KitView } from './kit-view';
import type { KitSetRow } from '../lib/kit-set';

// The kits, one row for each kit with a value for each of its packages. Adding and changing a kit
// happens on the page that makes one; here a whole kit can be deleted.
export function KitsScreen() {
  const t = useTranslations('actions');
  const tg = useTranslations('itemGroups');
  const tf = useTranslations('forms');
  const tk = useResourceText('kits');
  const toast = useToast();
  const queryClient = useQueryClient();
  // Only the kits in this group, and in the groups inside it.
  const [groupId, setGroupId] = useState('');
  const tv = useTranslations('kitView');
  const [viewing, setViewing] = useState<KitSetRow | null>(null);
  const [removing, setRemoving] = useState<KitSetRow | null>(null);
  const resource = useMemo(() => kitsResource(tk, groupId), [tk, groupId]);

  const remove = useMutation({
    mutationFn: async (row: KitSetRow) => {
      for (const kit of row.set) await request('DELETE', `/admin/kits/${kit.id}`);
    },
    onSuccess: async () => {
      setRemoving(null);
      await queryClient.invalidateQueries({ queryKey: ['kits'] });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  return (
    <>
      <ResourceScreen
        resource={resource}
        deepLink
        pages={{ create: routes.newKit(), edit: (row) => routes.kit(row.id) }}
        toolbar={
          <>
            <SearchSelect
              source={priceGroups}
              value={groupId}
              onChange={(value) => setGroupId(String(value))}
              placeholder={tg('everyGroup')}
              aria-label={tg('filter')}
              className="w-44"
            />
            <Link
              href={routes.newKit()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('newKitPage')}
            </Link>
          </>
        }
        rowActions={(row) => (
          <>
            <IconButton icon="eye" label={tv('view')} onClick={() => setViewing(row)} />
            <IconButton
              icon="trash"
              variant="danger"
              label={tf('delete')}
              onClick={() => setRemoving(row)}
            />
          </>
        )}
      />
      <KitView row={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => (next ? undefined : setRemoving(null))}
        title={tf('deleteTitle', { name: removing?.nameNe ?? '' })}
        description={tf('deleteKitNote', { count: removing?.set.length ?? 0 })}
        confirmLabel={tf('delete')}
        onConfirm={() => removing && remove.mutate(removing)}
      />
    </>
  );
}
