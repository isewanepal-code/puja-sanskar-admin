'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useToast } from '@/components/overlays';
import { ResourceScreen, useResourceText } from '@/components/resource';
import { IconButton } from '@/components/ui/button';
import { isApiError, request } from '@/lib/api';

import { branchesResource, type Branch } from '../resources';

export function BranchesScreen() {
  const t = useResourceText('branches');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const resource = useMemo(() => branchesResource(t), [t]);

  const online = useMutation({
    mutationFn: (branch: Branch) => request('PUT', `/admin/branches/${branch.id}/online`),
    onSuccess: async () => {
      toast.success(t('onlineMoved'));
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  return (
    <ResourceScreen
      resource={resource}
      rowActions={(row) =>
        row.servesOnline || !row.isActive ? null : (
          <IconButton icon="share" label={t('makeOnline')} onClick={() => online.mutate(row)} />
        )
      }
    />
  );
}
