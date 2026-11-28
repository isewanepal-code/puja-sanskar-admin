'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ResourceScreen, useResourceText } from '@/components/resource';
import { IconButton } from '@/components/ui/button';

import { offersResource, type Offer } from '../offers';
import { priceGroupsResource, type PriceGroup } from '../price-groups';
import { GroupMembers } from './group-members';
import { OfferView } from './offer-view';

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
  const tv = useTranslations('offerView');
  const resource = useMemo(() => offersResource(t), [t]);
  const [viewing, setViewing] = useState<Offer | null>(null);
  return (
    <>
      <ResourceScreen
        resource={resource}
        rowActions={(row) => (
          <IconButton icon="eye" label={tv('view')} onClick={() => setViewing(row)} />
        )}
      />
      <OfferView offer={viewing} onClose={() => setViewing(null)} />
    </>
  );
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
