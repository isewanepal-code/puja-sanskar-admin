'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { ResourceScreen, useResourceText } from '@/components/resource';
import { groupChoices } from '@/features/puja-groups';

import { pujasResource } from '../resource';

export function PujasScreen() {
  const t = useResourceText('pujas');
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

  return <ResourceScreen resource={resource} />;
}
