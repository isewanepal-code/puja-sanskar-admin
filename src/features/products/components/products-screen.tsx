'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ActionModal, ResourceScreen } from '@/components/resource';
import { IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { request } from '@/lib/api';

import {
  gradesResource,
  pairingsResource,
  productsResource,
  variantsResource,
  type Product,
} from '../resources';

type Open = { what: 'packs' | 'grades' | 'pairings'; id: string } | null;

// The product as it is now, so grades added a moment ago reach its packs' form.
function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'one', id],
    queryFn: () => request<Product>('GET', `/admin/products/${id}`),
    enabled: !!id,
  });
}

export function ProductsScreen() {
  const t = useTranslations('actions');
  const [open, setOpen] = useState<Open>(null);
  const product = useProduct(open?.id);
  const pairings = useQuery({
    queryKey: ['products', 'pairings', open?.id],
    queryFn: () => request<Product[]>('GET', `/admin/products/${open!.id}/pairings`),
    enabled: open?.what === 'pairings',
  });
  const close = () => setOpen(null);
  const name = product.data ? `${product.data.code} · ${product.data.nameNe}` : '';

  return (
    <>
      <ResourceScreen
        resource={productsResource}
        rowActions={(row) => (
          <>
            <IconButton
              icon="box"
              label={t('packs')}
              onClick={() => setOpen({ what: 'packs', id: row.id })}
            />
            <IconButton
              icon="star"
              label={t('grades')}
              onClick={() => setOpen({ what: 'grades', id: row.id })}
            />
            <IconButton
              icon="share"
              label={t('pairings')}
              onClick={() => setOpen({ what: 'pairings', id: row.id })}
            />
          </>
        )}
      />

      <Modal
        open={open?.what === 'packs' || open?.what === 'grades'}
        onOpenChange={(next) => (next ? undefined : close())}
        size="xl"
        title={open?.what === 'grades' ? t('gradesOf', { name }) : t('packsOf', { name })}
        description={open?.what === 'grades' ? t('gradesNote') : t('packsNote')}
      >
        {product.data && open?.what === 'packs' ? (
          <ResourceScreen resource={variantsResource(product.data)} />
        ) : null}
        {product.data && open?.what === 'grades' ? (
          <ResourceScreen resource={gradesResource(product.data)} />
        ) : null}
      </Modal>

      <ActionModal
        resource={
          open?.what === 'pairings' && product.data && pairings.data
            ? pairingsResource(product.data)
            : null
        }
        defaults={{ productIds: (pairings.data ?? []).map((paired) => paired.id) }}
        size="lg"
        title={t('pairingsOf', { name })}
        description={t('pairingsNote')}
        submitLabel={t('savePairings')}
        doneMessage={t('pairingsSaved')}
        onClose={close}
      />
    </>
  );
}
