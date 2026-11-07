'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import {
  ActionModal,
  ResourceScreen,
  useResourceText,
  WorkbookUploadButton,
} from '@/components/resource';
import { IconButton } from '@/components/ui/button';
import { SearchSelect } from '@/components/controls';
import { Modal } from '@/components/ui/modal';
import type { Schema } from '@/lib/api';
import { choices } from '@/lib/choices';

import { cn } from '@/lib/utils';

import {
  historyResource,
  movementResource,
  STOCK_SHOWS,
  stockResource,
  transferStockResource,
  type StockShow,
} from '../resources';

type Level = Schema<'StockLevelResponse'>;
type Open = { what: 'record' | 'history' | 'transfer'; level: Level } | null;

export function StockScreen({ initialShow = 'all' }: { initialShow?: StockShow }) {
  const t = useTranslations('actions');
  const tm = useResourceText('movements');
  const [show, setShow] = useState<StockShow>(initialShow);
  const [productId, setProductId] = useState('');
  const [open, setOpen] = useState<Open>(null);
  const resource = useMemo(() => stockResource(show, productId || undefined), [show, productId]);
  const name = open ? `${open.level.variant.sku} · ${open.level.variant.label}` : '';

  return (
    <>
      <ResourceScreen
        resource={resource}
        toolbar={
          <>
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
            <IconButton
              icon="plus"
              label={t('recordMovement')}
              onClick={() => setOpen({ what: 'record', level: row })}
            />
            <IconButton
              icon="clock"
              label={t('history')}
              onClick={() => setOpen({ what: 'history', level: row })}
            />
            <IconButton
              icon="truck"
              label={t('sendToBranch')}
              onClick={() => setOpen({ what: 'transfer', level: row })}
            />
          </>
        )}
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
