'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ActionModal, CountButton, ResourceScreen, useResourceText } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

import { kitFromPujaResource, kitItemsResource, kitsResource, type Kit } from '../resources';

export function KitsScreen() {
  const t = useTranslations('actions');
  const tk = useResourceText('kits');
  const [fromPuja, setFromPuja] = useState(false);
  const [itemsOf, setItemsOf] = useState<Kit | null>(null);
  // The items count opens the items, as the button on the row does.
  const resource = useMemo(() => {
    const base = kitsResource(tk);
    return {
      ...base,
      columns: base.columns.map((column) =>
        column.key === 'items'
          ? {
              ...column,
              cell: (row: Kit) => (
                <CountButton
                  label={t('itemsOf', { name: `${row.code} · ${row.nameNe}` })}
                  onClick={() => setItemsOf(row)}
                >
                  {row.items.length}
                </CountButton>
              ),
            }
          : column,
      ),
    };
  }, [tk, t]);

  return (
    <>
      <ResourceScreen
        resource={resource}
        toolbar={
          <Button variant="secondary" icon="temple" onClick={() => setFromPuja(true)}>
            {t('kitFromPuja')}
          </Button>
        }
        onCreated={setItemsOf}
        rowActions={(row) => (
          <Button variant="secondary" size="sm" icon="list" onClick={() => setItemsOf(row)}>
            {t('itemsCount', { count: row.items.length })}
          </Button>
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
