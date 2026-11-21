'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { priceGroups } from '@/features/marketing';
import { ResourceScreen, WorkbookUploadButton } from '@/components/resource';
import { IconButton, buttonVariants } from '@/components/ui/button';
import { ArchiveModal, type ArchiveTarget } from '@/features/archive';
import { routes } from '@/lib/routes';

import { productsResource } from '../resources';
import type { Product } from './use-product';

export function ProductsScreen() {
  const t = useTranslations('actions');
  const router = useRouter();
  const [archiving, setArchiving] = useState<ArchiveTarget | null>(null);
  // Only the items in this group, and in the groups inside it.
  const [groupId, setGroupId] = useState('');
  const tg = useTranslations('itemGroups');

  // A link from the global search (?open=<id>) goes to that item's page.
  const openId = useSearchParams().get('open');
  useEffect(() => {
    if (openId) router.replace(routes.item(openId));
  }, [openId, router]);

  const resource = useMemo(
    () => ({
      ...productsResource,
      // Download Excel gives the item list as the shop keeps it: a sheet per category.
      exportPath: '/admin/items/sheet',
      listQuery: { ...productsResource.listQuery, ...(groupId && { groupId }) },
      // An item is changed on its own page.
      canEdit: false,
      columns: productsResource.columns.map((column) =>
        column.key === 'variants'
          ? {
              ...column,
              cell: (row: Product) => (
                <button
                  type="button"
                  title={t('packsOf', { name: row.nameNe })}
                  onClick={() => router.push(routes.item(row.id) + '#prices')}
                  className="flex max-w-[16rem] flex-wrap justify-end gap-1 text-right"
                >
                  {row.variants.slice(0, 4).map((v) => (
                    <span
                      key={v.id}
                      className={
                        v.isActive
                          ? 'rounded border border-border bg-card px-1.5 py-0.5 text-xs'
                          : 'rounded border border-dashed border-border px-1.5 py-0.5 text-xs text-muted-foreground'
                      }
                    >
                      {v.label}
                    </span>
                  ))}
                  {row.variants.length > 4 ? (
                    <span className="px-1 py-0.5 text-xs text-muted-foreground">
                      +{row.variants.length - 4}
                    </span>
                  ) : null}
                </button>
              ),
            }
          : column,
      ),
    }),
    [t, router, groupId],
  );

  return (
    <>
      <ResourceScreen
        resource={resource}
        toolbar={
          <>
            <SearchSelect
              source={priceGroups}
              value={groupId}
              onChange={(value) => setGroupId(String(value))}
              placeholder={tg('everyGroup')}
              aria-label={tg('filter')}
              className="w-44"
            />
            <WorkbookUploadButton
              path="/admin/items/sheet"
              templatePath="/admin/items/sheet"
              title={t('uploadItemList')}
              description={t('uploadItemListNote')}
              refresh={['products', 'stock', 'categories', 'materials']}
            />
            <Link href={routes.addItem()} className={buttonVariants({ variant: 'primary' })}>
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
    </>
  );
}
