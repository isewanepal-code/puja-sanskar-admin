'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PurchaseBillForm } from '@/features/purchases';
import { formatMoney } from '@/lib/format';

import type { Product } from './use-product';

// How this item came into the shop: what each pack cost, from whom and when, with one button to
// record a new purchase of it. A posted purchase puts the packs on the shelf and sets their cost.
export function BuyingPanel({ product }: { product: Product }) {
  const t = useTranslations('itemPage');
  const [buying, setBuying] = useState(false);
  const packs = product.variants.map((variant) => ({
    value: variant.id,
    label: `${product.nameNe} · ${variant.label}`,
    detail: variant.sku,
  }));

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{t('buyingNote')}</p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2">{t('pack')}</th>
              <th className="px-3 py-2">{t('cost')}</th>
              <th className="px-3 py-2">{t('lastBought')}</th>
              <th className="px-3 py-2">{t('onShelf')}</th>
            </tr>
          </thead>
          <tbody>
            {product.variants.map((variant) => (
              <tr key={variant.id}>
                <td className="border-t border-border px-3 py-2 font-medium">{variant.label}</td>
                <td className="border-t border-border px-3 py-2">
                  {variant.cost ? formatMoney(variant.cost, 'en') : '—'}
                </td>
                <td className="border-t border-border px-3 py-2 text-xs">
                  {variant.lastBought ? (
                    <>
                      <div className="font-medium">{variant.lastBought.supplierName}</div>
                      <div className="text-muted-foreground">
                        {formatMoney(variant.lastBought.unitCost, 'en')} ·{' '}
                        {variant.lastBought.billDay}
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">{t('neverBought')}</span>
                  )}
                </td>
                <td className="border-t border-border px-3 py-2">
                  <Badge tone={variant.inStock ? 'success' : 'warning'}>
                    {variant.inStock ? t('inStock') : t('noStock')}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <Button icon="plus" disabled={packs.length === 0} onClick={() => setBuying(true)}>
          {t('recordPurchase')}
        </Button>
        {packs.length === 0 ? (
          <span className="ml-3 text-sm text-muted-foreground">{t('makePacksFirst')}</span>
        ) : null}
      </div>
      {buying ? <PurchaseBillForm open packs={packs} onClose={() => setBuying(false)} /> : null}
    </div>
  );
}
