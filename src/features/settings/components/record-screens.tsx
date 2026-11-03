'use client';

import { useMemo } from 'react';

import { RecordScreen, useResourceText } from '@/components/resource';

import { businessProfileResource, shopSettingsResource } from '../records';

export const BusinessProfileScreen = () => <RecordScreen resource={businessProfileResource} />;

export function ShopSettingsScreen() {
  const t = useResourceText('shopSettings');
  const resource = useMemo(() => shopSettingsResource(t), [t]);
  return <RecordScreen resource={resource} />;
}
