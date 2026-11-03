'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ActionModal, ResourceScreen, useResourceText } from '@/components/resource';
import { IconButton } from '@/components/ui/button';
import type { Schema } from '@/lib/api';

import {
  deliverySlotsResource,
  deliveryZonesResource,
  taxClassesResource,
  taxRateResource,
} from '../resources';

type TaxClass = Schema<'TaxClassResponse'>;

export function TaxClassesScreen() {
  const t = useResourceText('taxClasses');
  const ta = useTranslations('actions');
  const resource = useMemo(() => taxClassesResource(t), [t]);
  const [rating, setRating] = useState<TaxClass | null>(null);

  return (
    <>
      <ResourceScreen
        resource={resource}
        rowActions={(row) => (
          <IconButton icon="calendar" label={ta('newRate')} onClick={() => setRating(row)} />
        )}
      />
      <ActionModal
        resource={rating ? taxRateResource(rating) : null}
        title={ta('newRateFor', { name: rating?.name ?? '' })}
        description={ta('newRateNote')}
        submitLabel={ta('schedule')}
        doneMessage={ta('scheduled')}
        onClose={() => setRating(null)}
      />
    </>
  );
}

export const DeliveryZonesScreen = () => <ResourceScreen resource={deliveryZonesResource} />;
export const DeliverySlotsScreen = () => <ResourceScreen resource={deliverySlotsResource} />;
