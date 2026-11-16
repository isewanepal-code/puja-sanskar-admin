'use client';

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { ProductOffersPanel } from '@/features/marketing';
import { ResourceForm, ResourceScreen } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { InfoTip } from '@/components/ui/info-tip';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

import { gradesResource, pairingsResource, productsResource, variantsResource } from '../resources';
import { OptionsPanel } from './options-panel';
import { PhotosPanel } from './photos-panel';
import { useProduct, type Product } from './use-product';

const TABS = ['details', 'packs', 'options', 'photos', 'offers', 'quality', 'pairs'] as const;
export type WorkspaceTab = (typeof TABS)[number];

// Everything about one item in one window, one tab for each job, so nothing hides behind an icon.
export function ItemWorkspace({
  product: initial,
  tab: first = 'details',
  onClose,
}: {
  product: Product;
  tab?: WorkspaceTab;
  onClose: () => void;
}) {
  const t = useTranslations('itemWorkspace');
  const tf = useTranslations('forms');
  const formId = useId();
  const [tab, setTab] = useState<WorkspaceTab>(first);
  const [saving, setSaving] = useState(false);
  const { data } = useProduct(initial.id, initial);
  const product = data ?? initial;
  const without = (fields: typeof productsResource.fields) =>
    fields.filter((field) => field.name !== 'images');
  // Photos have their own tab, so saving the details never touches them.
  const detailsResource = { ...productsResource, fields: without(productsResource.fields) };

  return (
    <Modal
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      size="xl"
      title={
        <span className="inline-flex items-center gap-2">
          {product.nameNe}
          <span className="text-sm font-normal text-muted-foreground">{product.code}</span>
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('close')}
          </Button>
          {tab === 'details' ? (
            <Button type="submit" form={formId} disabled={saving}>
              {saving ? tf('saving') : tf('save')}
            </Button>
          ) : null}
        </>
      }
    >
      <div
        role="tablist"
        aria-label={t('tabs')}
        className="-mt-1 mb-4 flex flex-wrap gap-1 border-b border-border pb-2"
      >
        {TABS.map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === key
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {t(`tab.${key}`)}
          </button>
        ))}
        <span className="ml-auto self-center">
          <InfoTip text={t(`help.${tab}`)} align="right" label={t('helpLabel')} />
        </span>
      </div>

      {tab === 'details' ? (
        <ResourceForm
          key={`details-${product.id}`}
          resource={detailsResource}
          row={product}
          formId={formId}
          onPendingChange={setSaving}
          onDone={() => undefined}
        />
      ) : null}
      {tab === 'packs' ? <ResourceScreen resource={variantsResource(product)} /> : null}
      {tab === 'options' ? <OptionsPanel key={product.id} product={product} /> : null}
      {tab === 'photos' ? <PhotosPanel product={product} /> : null}
      {tab === 'offers' ? (
        <ProductOffersPanel
          product={{
            id: product.id,
            nameNe: product.nameNe,
            variants: product.variants.map((v) => ({ id: v.id, label: v.label })),
          }}
        />
      ) : null}
      {tab === 'quality' ? <ResourceScreen resource={gradesResource(product)} /> : null}
      {tab === 'pairs' ? (
        <PairsForm key={product.id} product={product} formId={formId} onSaving={setSaving} />
      ) : null}
    </Modal>
  );
}

import { useQuery } from '@tanstack/react-query';

import { request } from '@/lib/api';

// What goes well with this item: chosen here, shown on its page and as cart suggestions.
function PairsForm({
  product,
  formId,
  onSaving,
}: {
  product: Product;
  formId: string;
  onSaving: (saving: boolean) => void;
}) {
  const t = useTranslations('itemWorkspace');
  const tf = useTranslations('forms');
  const paired = useQuery({
    queryKey: ['products', 'pairings', product.id],
    queryFn: () => request<Product[]>('GET', `/admin/products/${product.id}/pairings`),
  });
  if (!paired.data) return <p className="text-sm text-muted-foreground">…</p>;
  return (
    <div className="grid gap-3">
      <ResourceForm
        resource={pairingsResource(product)}
        formId={`${formId}-pairs`}
        defaults={{ productIds: paired.data.map((other) => other.id) }}
        successMessage={t('pairsSaved')}
        onPendingChange={onSaving}
        onDone={() => undefined}
      />
      <div>
        <Button type="submit" form={`${formId}-pairs`}>
          {tf('save')}
        </Button>
      </div>
    </div>
  );
}
