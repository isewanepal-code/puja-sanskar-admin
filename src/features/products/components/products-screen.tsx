'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import {
  ActionModal,
  BulkGrid,
  CountButton,
  ResourceScreen,
  WorkbookUploadButton,
} from '@/components/resource';
import { Button, IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { request } from '@/lib/api';

import {
  gradesResource,
  pairingsResource,
  productsResource,
  quickItemResource,
  variantsResource,
  type Product,
} from '../resources';

type Open = { what: 'packs' | 'grades' | 'pairings'; id: string } | { what: 'new' | 'many' } | null;

// The product as it is now, so grades added a moment ago reach its packs' form.
function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'one', id],
    queryFn: () => request<Product>('GET', `/admin/products/${id}`),
    enabled: !!id,
  });
}

// Under an item's edit form: its packs, so a price changes in the same place.
function EditPacks({ id }: { id: string }) {
  const t = useTranslations('actions');
  const product = useProduct(id);
  return (
    <section className="mt-6 grid gap-2 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">{t('packsAndPrices')}</h3>
      <p className="text-sm text-muted-foreground">{t('packsNote')}</p>
      {product.data ? <ResourceScreen resource={variantsResource(product.data)} /> : null}
    </section>
  );
}

export function ProductsScreen() {
  const t = useTranslations('actions');
  const tf = useTranslations('forms');
  const [open, setOpen] = useState<Open>(null);
  const id = open && 'id' in open ? open.id : undefined;
  const product = useProduct(id);
  const pairings = useQuery({
    queryKey: ['products', 'pairings', id],
    queryFn: () => request<Product[]>('GET', `/admin/products/${id}/pairings`),
    enabled: open?.what === 'pairings',
  });
  const close = () => setOpen(null);
  // The packs count opens the packs, as the pack button on the row does.
  const resource = useMemo(
    () => ({
      ...productsResource,
      columns: productsResource.columns.map((column) =>
        column.key === 'variants'
          ? {
              ...column,
              cell: (row: Product) => (
                <CountButton
                  label={t('packsOf', { name: row.nameNe })}
                  onClick={() => setOpen({ what: 'packs', id: row.id })}
                >
                  {row.variants.length}
                </CountButton>
              ),
            }
          : column,
      ),
    }),
    [t],
  );
  const name = product.data ? `${product.data.code} · ${product.data.nameNe}` : '';

  return (
    <>
      <ResourceScreen
        resource={resource}
        editFooter={(row) => <EditPacks id={row.id} />}
        toolbar={
          <>
            <WorkbookUploadButton
              path="/admin/products/import"
              templatePath="/admin/products/import/template"
              title={t('uploadProducts')}
              description={t('uploadProductsNote')}
              refresh={['products', 'stock']}
            />
            <Button variant="secondary" icon="list" onClick={() => setOpen({ what: 'many' })}>
              {tf('bulkAdd')}
            </Button>
            <Button icon="plus" onClick={() => setOpen({ what: 'new' })}>
              {t('addItem')}
            </Button>
          </>
        }
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

      <BulkGrid
        resource={quickItemResource}
        open={open?.what === 'many'}
        onOpenChange={(next) => (next ? undefined : close())}
        description={t('addManyItemsNote')}
      />

      <ActionModal
        resource={open?.what === 'new' ? quickItemResource : null}
        size="lg"
        title={t('addItem')}
        description={t('addItemNote')}
        submitLabel={t('addItem')}
        doneMessage={t('itemAdded')}
        onClose={close}
      />

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
