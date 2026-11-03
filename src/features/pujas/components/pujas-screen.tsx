'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ActionModal, ResourceScreen, useResourceText } from '@/components/resource';
import { IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { groupChoices } from '@/features/puja-groups';
import type { Schema } from '@/lib/api';

import { requirementsResource, verifyResource } from '../requirements';
import { pujasResource } from '../resource';
import type { Puja } from '../types';

type Requirement = Schema<'AdminRequirementResponse'>;

export function PujasScreen() {
  const t = useResourceText('pujas');
  const tr = useResourceText('requirements');
  const ta = useTranslations('actions');
  const [listOf, setListOf] = useState<Puja | null>(null);
  const [verifying, setVerifying] = useState<Requirement | null>(null);
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
    <>
      <ResourceScreen
        resource={resource}
        rowActions={(row) => (
          <IconButton icon="list" label={ta('samagriList')} onClick={() => setListOf(row)} />
        )}
      />
      <Modal
        open={listOf !== null}
        onOpenChange={(next) => (next ? undefined : setListOf(null))}
        size="xl"
        title={ta('samagriListOf', { name: listOf ? `${listOf.code} · ${listOf.nameNe}` : '' })}
        description={ta('samagriListNote')}
      >
        {listOf ? (
          <ResourceScreen
            resource={requirementsResource(listOf.id, tr)}
            rowActions={(row) => (
              <IconButton icon="shield" label={ta('verify')} onClick={() => setVerifying(row)} />
            )}
          />
        ) : null}
      </Modal>
      <ActionModal
        resource={listOf && verifying ? verifyResource(listOf.id, verifying, tr) : null}
        title={ta('verifyFor', { name: verifying?.material.nameNe ?? '' })}
        description={ta('verifyNote')}
        submitLabel={ta('verify')}
        doneMessage={ta('verified')}
        onClose={() => setVerifying(null)}
      />
    </>
  );
}
