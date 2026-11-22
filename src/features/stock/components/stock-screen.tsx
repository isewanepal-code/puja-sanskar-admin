'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import {
  ActionModal,
  ResourceScreen,
  useResourceText,
  WorkbookUploadButton,
} from '@/components/resource';
import { ConfirmDialog, useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { useTestModeOn } from '@/hooks/use-test-mode';
import { RowMenu } from '@/components/ui/row-menu';
import { SearchSelect } from '@/components/controls';
import { Modal } from '@/components/ui/modal';
import { isApiError, request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { choices } from '@/lib/choices';

import { cn } from '@/lib/utils';

import { RepackForm } from './repack-form';
import {
  historyResource,
  movementResource,
  STOCK_SHOWS,
  stockCountResource,
  stockLossResource,
  stockResource,
  transferStockResource,
  type StockShow,
} from '../resources';

type Level = Schema<'StockLevelResponse'>;
type Summary = Schema<'StockSummaryResponse'>;
type Open = {
  what: 'record' | 'history' | 'transfer' | 'repack' | 'wipe' | 'loss' | 'count';
  level: Level;
} | null;

export function StockScreen({ initialShow = 'all' }: { initialShow?: StockShow }) {
  const t = useTranslations('actions');
  const tm = useResourceText('movements');
  const [show, setShow] = useState<StockShow>(initialShow);
  const [productId, setProductId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [brand, setBrand] = useState('');
  const summary = useQuery({
    queryKey: ['stock', 'summary'],
    queryFn: () => request<Summary>('GET', '/admin/stock-levels/summary'),
  });
  const [open, setOpen] = useState<Open>(null);
  const tw = useTranslations('stockWipe');
  const tk = useTranslations('stockWork');
  const toast = useToast();
  const queryClient = useQueryClient();
  // Staging only: a pack's stock at a branch can be wiped, history and all.
  const testMode = useTestModeOn();
  const wipe = useMutation({
    mutationFn: (level: Level) =>
      request('DELETE', `/admin/stock-levels/${level.variant.id}`, {
        headers: { 'X-Branch': level.branch.code },
      }),
    onSuccess: async () => {
      toast.success(tw('done'));
      setOpen(null);
      await queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tw('failed')),
  });
  const resource = useMemo(
    () =>
      stockResource(show, {
        productId: productId || undefined,
        categoryId: categoryId || undefined,
        groupId: groupId || undefined,
        supplierId: supplierId || undefined,
        brand: brand.trim() || undefined,
      }),
    [show, productId, categoryId, groupId, supplierId, brand],
  );
  const name = open ? `${open.level.variant.sku} · ${open.level.variant.label}` : '';

  const tiles = summary.data
    ? [
        { label: t('tileValue'), value: formatMoney(summary.data.stockValue, 'en') },
        { label: t('tileInStock'), value: summary.data.inStock },
        { label: t('tileLow'), value: summary.data.low, warn: summary.data.low > 0 },
        { label: t('tileOut'), value: summary.data.out, warn: summary.data.out > 0 },
      ]
    : [];

  return (
    <>
      {tiles.length ? (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-lg border border-border bg-card px-4 py-3">
              <div className="text-xs text-muted-foreground">{tile.label}</div>
              <div className={cn('text-xl font-semibold', tile.warn && 'text-destructive')}>
                {tile.value}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <ResourceScreen
        resource={resource}
        // A link with ?q= (from the manual) opens the list already searched.
        deepLink
        toolbar={
          <>
            <SearchSelect
              source={choices.categories}
              value={categoryId}
              onChange={(value) => setCategoryId(String(value))}
              placeholder={t('allCategories')}
              aria-label={t('category')}
              className="w-48"
            />
            <SearchSelect
              source={choices.itemGroups}
              value={groupId}
              onChange={(value) => setGroupId(String(value))}
              placeholder={t('allGroups')}
              aria-label={t('group')}
              className="w-44"
            />
            <SearchSelect
              source={choices.suppliers}
              value={supplierId}
              onChange={(value) => setSupplierId(String(value))}
              placeholder={t('allSuppliers')}
              aria-label={t('supplier')}
              className="w-44"
            />
            <SearchSelect
              source={choices.brands}
              value={brand}
              onChange={(value) => setBrand(String(value))}
              placeholder={t('brand')}
              aria-label={t('brand')}
              className="w-36"
            />
            <SearchSelect
              source={choices.products}
              value={productId}
              onChange={(value) => setProductId(String(value))}
              placeholder={t('allProducts')}
              aria-label={t('product')}
              className="w-64"
            />
            <div
              className="inline-flex rounded-lg bg-muted p-1"
              role="group"
              aria-label={t('showStock')}
            >
              {STOCK_SHOWS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={show === option}
                  onClick={() => setShow(option)}
                  className={cn(
                    'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                    show === option
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t(`show.${option}`)}
                </button>
              ))}
            </div>
            <WorkbookUploadButton
              path="/admin/stock-levels/import"
              templatePath="/admin/stock-levels/import/template"
              title={t('uploadStock')}
              description={t('uploadStockNote')}
              refresh={['stock']}
            />
          </>
        }
        rowActions={(row) => (
          <>
            {/* The everyday jobs right on the row: no pack to pick on another page. */}
            <Button
              variant="secondary"
              size="sm"
              title={tk('taskNote.loss')}
              onClick={() => setOpen({ what: 'loss', level: row })}
            >
              {tk('rowLoss')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              title={tk('taskNote.count')}
              onClick={() => setOpen({ what: 'count', level: row })}
            >
              {tk('rowCount')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              title={tk('taskNote.repack')}
              onClick={() => setOpen({ what: 'repack', level: row })}
            >
              {tk('rowRepack')}
            </Button>
            <RowMenu
              compact
              label={t('moreActions')}
              items={[
                {
                  icon: 'clock',
                  label: t('stockHistory'),
                  onSelect: () => setOpen({ what: 'history', level: row }),
                },
                {
                  icon: 'plus',
                  label: t('stockUpdate'),
                  onSelect: () => setOpen({ what: 'record', level: row }),
                },
                {
                  icon: 'truck',
                  label: t('sendToBranch'),
                  onSelect: () => setOpen({ what: 'transfer', level: row }),
                },
                ...(testMode
                  ? [
                      {
                        icon: 'trash' as const,
                        label: tw('action'),
                        danger: true,
                        onSelect: () => setOpen({ what: 'wipe', level: row }),
                      },
                    ]
                  : []),
              ]}
            />
          </>
        )}
      />
      <ActionModal
        resource={open?.what === 'loss' ? stockLossResource(open.level) : null}
        size="sm"
        title={tk('lossTitle', { name })}
        description={tk('lossNote')}
        submitLabel={tk('record')}
        doneMessage={tk('recorded')}
        onClose={() => setOpen(null)}
      />
      <ActionModal
        resource={open?.what === 'count' ? stockCountResource(open.level) : null}
        size="sm"
        title={tk('countTitle', { name })}
        description={tk('countNote', { count: open?.level.onHand ?? 0 })}
        submitLabel={tk('record')}
        doneMessage={tk('recorded')}
        onClose={() => setOpen(null)}
      />
      <ActionModal
        resource={open?.what === 'record' ? movementResource(open.level, tm) : null}
        title={t('recordMovementFor', { name })}
        description={t('recordMovementNote')}
        submitLabel={t('record')}
        doneMessage={t('recorded')}
        onClose={() => setOpen(null)}
      />
      <ActionModal
        resource={open?.what === 'transfer' ? transferStockResource(open.level) : null}
        title={t('sendToBranchOf', { name })}
        description={t('sendToBranchNote')}
        submitLabel={t('send')}
        doneMessage={t('sent')}
        onClose={() => setOpen(null)}
      />
      <ConfirmDialog
        open={open?.what === 'wipe'}
        onOpenChange={(next) => (next ? undefined : setOpen(null))}
        title={tw('title', { name })}
        description={tw('note')}
        confirmLabel={wipe.isPending ? tw('wiping') : tw('confirm')}
        onConfirm={() => open && wipe.mutate(open.level)}
      />
      {open?.what === 'repack' ? (
        <RepackForm level={open.level} onClose={() => setOpen(null)} />
      ) : null}
      <Modal
        open={open?.what === 'history'}
        onOpenChange={(next) => (next ? undefined : setOpen(null))}
        size="xl"
        title={t('historyOf', { name })}
      >
        {open?.what === 'history' ? (
          <ResourceScreen resource={historyResource(open.level, tm)} />
        ) : null}
      </Modal>
    </>
  );
}
