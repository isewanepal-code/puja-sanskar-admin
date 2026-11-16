'use client';

import { useSearchParams } from 'next/navigation';
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
import { ArchiveModal, type ArchiveTarget } from '@/features/archive';

import { productsResource, quickItemResource } from '../resources';
import { ItemWorkspace, type WorkspaceTab } from './item-workspace';
import { useProduct, type Product } from './use-product';

type Creating = 'new' | 'many' | null;

export function ProductsScreen() {
  const t = useTranslations('actions');
  const tf = useTranslations('forms');
  const [creating, setCreating] = useState<Creating>(null);
  const [archiving, setArchiving] = useState<ArchiveTarget | null>(null);
  // One item opened in its workspace, on the tab asked for.
  const [chosen, setWorkspace] = useState<{ product: Product; tab: WorkspaceTab } | null>(null);
  // A link from the global search (?open=<id>) opens that item straight away.
  const openId = useSearchParams().get('open');
  const [dismissed, setDismissed] = useState(false);
  const linked = useProduct(!dismissed ? (openId ?? undefined) : undefined);
  const workspace =
    chosen ??
    (linked.data && !dismissed ? { product: linked.data, tab: 'details' as const } : null);

  const resource = useMemo(
    () => ({
      ...productsResource,
      // The workspace is the one place an item is changed.
      canEdit: false,
      columns: productsResource.columns.map((column) =>
        column.key === 'variants'
          ? {
              ...column,
              cell: (row: Product) => (
                <CountButton
                  label={t('packsOf', { name: row.nameNe })}
                  onClick={() => setWorkspace({ product: row, tab: 'packs' })}
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

  return (
    <>
      <ResourceScreen
        resource={resource}
        toolbar={
          <>
            <WorkbookUploadButton
              path="/admin/products/import"
              templatePath="/admin/products/import/template"
              title={t('uploadProducts')}
              description={t('uploadProductsNote')}
              refresh={['products', 'stock']}
            />
            <Button variant="secondary" icon="list" onClick={() => setCreating('many')}>
              {tf('bulkAdd')}
            </Button>
            <Button icon="plus" onClick={() => setCreating('new')}>
              {t('addItem')}
            </Button>
          </>
        }
        rowActions={(row) => (
          <>
            <Button
              variant="secondary"
              size="sm"
              icon="edit"
              onClick={() => setWorkspace({ product: row, tab: 'details' })}
            >
              {t('openItem')}
            </Button>
            <IconButton
              icon="archive"
              label={t('archive')}
              onClick={() => setArchiving({ kind: 'item', id: row.id, name: row.nameNe })}
            />
          </>
        )}
      />

      {workspace ? (
        <ItemWorkspace
          key={workspace.product.id}
          product={workspace.product}
          tab={workspace.tab}
          onClose={() => {
            setWorkspace(null);
            setDismissed(true);
          }}
        />
      ) : null}

      <ArchiveModal target={archiving} onClose={() => setArchiving(null)} />

      <BulkGrid
        resource={quickItemResource}
        open={creating === 'many'}
        onOpenChange={(next) => (next ? undefined : setCreating(null))}
        description={t('addManyItemsNote')}
      />

      <ActionModal
        resource={creating === 'new' ? quickItemResource : null}
        size="lg"
        title={t('addItem')}
        description={t('addItemNote')}
        submitLabel={t('addItem')}
        doneMessage={t('itemAdded')}
        onClose={() => setCreating(null)}
      />
    </>
  );
}
