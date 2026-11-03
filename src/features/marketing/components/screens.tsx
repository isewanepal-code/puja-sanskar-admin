'use client';

import { useMemo } from 'react';

import { ResourceScreen, useResourceText } from '@/components/resource';

import { discountsResource } from '../discounts';
import { panditsResource } from '../resources';

export const PanditsScreen = () => <ResourceScreen resource={panditsResource} />;

export function DiscountsScreen() {
  const t = useResourceText('discounts');
  const resource = useMemo(() => discountsResource(t), [t]);
  return <ResourceScreen resource={resource} />;
}
