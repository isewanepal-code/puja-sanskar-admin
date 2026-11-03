'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { ResourceScreen } from '@/components/resource';

import {
  categoriesResource,
  categoryChoices,
  materialsResource,
  sourcesResource,
  unitsResource,
} from '../resources';

export function CategoriesScreen() {
  const choices = useQuery({
    queryKey: ['options', categoryChoices.key],
    queryFn: categoryChoices.load,
    staleTime: 5 * 60 * 1000,
  });
  const resource = useMemo(() => {
    const names = new Map(
      (choices.data ?? []).map((option) => [option.value, option.label.trim()]),
    );
    return categoriesResource((id) => names.get(id));
  }, [choices.data]);
  return <ResourceScreen resource={resource} />;
}

export const MaterialsScreen = () => <ResourceScreen resource={materialsResource} />;
export const UnitsScreen = () => <ResourceScreen resource={unitsResource} />;
export const SourcesScreen = () => <ResourceScreen resource={sourcesResource} />;
