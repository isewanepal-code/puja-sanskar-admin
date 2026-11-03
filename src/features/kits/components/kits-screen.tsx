'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ActionModal, ResourceScreen, useResourceText } from '@/components/resource';
import { Button, IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

import { kitFromPujaResource, kitItemsResource, kitsResource, type Kit } from '../resources';

export function KitsScreen() {
  const t = useTranslations('actions');
  const tk = useResourceText('kits');
  const resource = useMemo(() => kitsResource(tk), [tk]);
  const [fromPuja, setFromPuja] = useState(false);
  const [itemsOf, setItemsOf] = useState<Kit | null>(null);

  return (
    <>
      <ResourceScreen
        resource={resource}
        toolbar={
          <Button variant="secondary" icon="temple" onClick={() => setFromPuja(true)}>
            {t('kitFromPuja')}
          </Button>
        }
        rowActions={(row) => (
          <IconButton icon="list" label={t('items')} onClick={() => setItemsOf(row)} />
        )}
      />
      <ActionModal
        resource={fromPuja ? kitFromPujaResource(tk) : null}
        size="md"
        title={t('kitFromPuja')}
        description={t('kitFromPujaNote')}
        submitLabel={t('makeKit')}
        doneMessage={t('kitMade')}
        onClose={() => setFromPuja(false)}
      />
      <Modal
        open={itemsOf !== null}
        onOpenChange={(next) => (next ? undefined : setItemsOf(null))}
        size="xl"
        title={t('itemsOf', { name: itemsOf ? `${itemsOf.code} · ${itemsOf.nameNe}` : '' })}
        description={t('itemsNote')}
      >
        {itemsOf ? <ResourceScreen resource={kitItemsResource(itemsOf.id)} /> : null}
      </Modal>
    </>
  );
}
