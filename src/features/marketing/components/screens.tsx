'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ResourceScreen, useResourceText } from '@/components/resource';
import { IconButton } from '@/components/ui/button';

import { offersResource } from '../offers';
import { priceGroupsResource, type PriceGroup } from '../price-groups';
import { GroupMembers } from './group-members';

import { discountsResource } from '../discounts';
import { panditsResource } from '../resources';

export const PanditsScreen = () => <ResourceScreen resource={panditsResource} />;

export function DiscountsScreen() {
  const t = useResourceText('discounts');
  const resource = useMemo(() => discountsResource(t), [t]);
  return <ResourceScreen resource={resource} />;
}

export function OffersScreen() {
  const t = useResourceText('offers');
  const resource = useMemo(() => offersResource(t), [t]);
  return <ResourceScreen resource={resource} />;
}

export function PriceGroupsScreen() {
  const t = useTranslations('groupMembers');
  const resource = useMemo(() => priceGroupsResource(), []);
  const [open, setOpen] = useState<PriceGroup | null>(null);
  return (
    <>
      <ResourceScreen
        resource={resource}
        rowActions={(row) => (
          <IconButton icon="list" label={t('open')} onClick={() => setOpen(row)} />
        )}
      />
      <GroupMembers group={open} onClose={() => setOpen(null)} />
    </>
  );
}
