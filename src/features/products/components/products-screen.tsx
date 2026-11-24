'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { priceGroups } from '@/features/marketing';
import { ResourceScreen, WorkbookUploadButton } from '@/components/resource';
import { Icon } from '@/components/icons';
import { IconButton, buttonVariants } from '@/components/ui/button';
import { ArchiveModal, type ArchiveTarget } from '@/features/archive';
import { routes } from '@/lib/routes';

import { productsResource } from '../resources';
import { ItemEditModal } from './item-edit-modal';
import { ItemSizes } from './item-sizes';
import type { Product } from './use-product';

export function ProductsScreen() {
  const t = useTranslations('actions');
  const router = useRouter();
  const [archiving, setArchiving] = useState<ArchiveTarget | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
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
      // The pen opens the same form as adding an item, filled.
      canEdit: false,
      // The quantities and their prices, side by side; pressing either opens all of them.
      columns: productsResource.columns.map((column) =>
        column.key === 'variants'
          ? { ...column, cell: (row: Product) => <ItemSizes product={row} show="quantity" /> }
          : column.key === 'fromPrice'
            ? { ...column, cell: (row: Product) => <ItemSizes product={row} show="price" /> }
            : column,
      ),
    }),
    [groupId],
  );

  return (
    <>
      <ResourceScreen
        resource={resource}
        // A link with ?q= (from the manual) opens the list already searched.
        deepLink
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
        // The pen changes the item's details; the tag opens its quantities and prices.
        rowActions={(row) => (
          <>
            <Link
              href={routes.quantityPrice(row.id)}
              aria-label={t('changeSizes')}
              title={t('changeSizes')}
              className={buttonVariants({ variant: 'ghost', size: 'icon' })}
            >
              <Icon name="tag" size={16} aria-hidden="true" />
            </Link>
            <IconButton icon="edit" label={t('editItem')} onClick={() => setEditing(row.id)} />
            <IconButton
              icon="archive"
              label={t('archive')}
              onClick={() => setArchiving({ kind: 'item', id: row.id, name: row.nameNe })}
            />
          </>
        )}
      />

      <ItemEditModal id={editing} onClose={() => setEditing(null)} />
      <ArchiveModal target={archiving} onClose={() => setArchiving(null)} />
    </>
  );
}
