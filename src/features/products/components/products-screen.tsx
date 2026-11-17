'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { BulkGrid, CountButton, ResourceScreen, WorkbookUploadButton } from '@/components/resource';
import { Button, IconButton, buttonVariants } from '@/components/ui/button';
import { ArchiveModal, type ArchiveTarget } from '@/features/archive';
import { routes } from '@/lib/routes';

import { productsResource, quickItemResource } from '../resources';
import type { Product } from './use-product';

export function ProductsScreen() {
  const t = useTranslations('actions');
  const tf = useTranslations('forms');
  const router = useRouter();
  const [many, setMany] = useState(false);
  const [archiving, setArchiving] = useState<ArchiveTarget | null>(null);

  // A link from the global search (?open=<id>) goes to that item's page.
  const openId = useSearchParams().get('open');
  useEffect(() => {
    if (openId) router.replace(routes.item(openId));
  }, [openId, router]);

  const resource = useMemo(
    () => ({
      ...productsResource,
      // An item is changed on its own page.
      canEdit: false,
      columns: productsResource.columns.map((column) =>
        column.key === 'variants'
          ? {
              ...column,
              cell: (row: Product) => (
                <CountButton
                  label={t('packsOf', { name: row.nameNe })}
                  onClick={() => router.push(routes.item(row.id) + '#prices')}
                >
                  {row.variants.length}
                </CountButton>
              ),
            }
          : column,
      ),
    }),
    [t, router],
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
            <Button variant="secondary" icon="list" onClick={() => setMany(true)}>
              {tf('bulkAdd')}
            </Button>
            <Link href={routes.flowItem()} className={buttonVariants({ variant: 'primary' })}>
              {t('addItem')}
            </Link>
          </>
        }
        rowActions={(row) => (
          <>
            <Link
              href={routes.item(row.id)}
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              {t('openItem')}
            </Link>
            <IconButton
              icon="archive"
              label={t('archive')}
              onClick={() => setArchiving({ kind: 'item', id: row.id, name: row.nameNe })}
            />
          </>
        )}
      />

      <ArchiveModal target={archiving} onClose={() => setArchiving(null)} />

      <BulkGrid
        resource={quickItemResource}
        open={many}
        onOpenChange={(next) => setMany(next ? true : false)}
        description={t('addManyItemsNote')}
      />
    </>
  );
}
