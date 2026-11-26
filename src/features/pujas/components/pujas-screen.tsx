'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { ResourceScreen, useResourceText } from '@/components/resource';
import { buttonVariants } from '@/components/ui/button';
import { groupChoices } from '@/features/puja-groups';
import { routes } from '@/lib/routes';

import { pujasResource } from '../resource';

// The pujas as a list; adding one and opening one are pages of their own, as for items.
export function PujasScreen() {
  const t = useResourceText('pujas');
  const ta = useTranslations('actions');
  const tt = useTranslations('pujas.tabs');
  const groups = useQuery({
    queryKey: ['options', groupChoices.key],
    queryFn: groupChoices.load,
    staleTime: 5 * 60 * 1000,
  });

  const resource = useMemo(() => {
    const names = new Map((groups.data ?? []).map((option) => [option.value, option.label.trim()]));
    return pujasResource(
      (id) => names.get(id),
      (kind) => t(`kinds.${kind}`),
    );
  }, [groups.data, t]);

  return (
    <ResourceScreen
      resource={resource}
      deepLink
      pages={{ create: routes.newPujaPage(), edit: (row) => routes.puja(row.id) }}
      toolbar={
        <Link href={routes.pujaGroups()} className={buttonVariants({ variant: 'secondary' })}>
          {tt('groups')}
        </Link>
      }
      rowActions={(row) => (
        <Link
          href={routes.newKit(row.id)}
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          {ta('makeKitOfPuja')}
        </Link>
      )}
    />
  );
}
