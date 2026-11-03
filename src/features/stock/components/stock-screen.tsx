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
import { Switch } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import type { Schema } from '@/lib/api';
import { choices } from '@/lib/choices';

import {
  historyResource,
  movementResource,
  stockResource,
  transferStockResource,
} from '../resources';

type Level = Schema<'StockLevelResponse'>;
type Open = { what: 'record' | 'history' | 'transfer'; level: Level } | null;

export function StockScreen() {
  const t = useTranslations('actions');
  const tm = useResourceText('movements');
  const [lowOnly, setLowOnly] = useState(false);
  const [productId, setProductId] = useState('');
  const [open, setOpen] = useState<Open>(null);
  const resource = useMemo(
    () => stockResource(lowOnly, productId || undefined),
    [lowOnly, productId],
  );
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
            <Switch
              label={t('lowOnly')}
              checked={lowOnly}
              onChange={(event) => setLowOnly(event.target.checked)}
            />
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
