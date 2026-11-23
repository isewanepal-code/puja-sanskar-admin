'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { Icon } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { RepackForm } from '@/features/stock';
import { request, type Schema } from '@/lib/api';
import { choices } from '@/lib/choices';
import { routes } from '@/lib/routes';

import { AddSizes, nameOf } from './pack-rows';
import { PriceForm } from './price-form';

type Product = Schema<'AdminProductResponse'>;
type Level = Schema<'StockLevelResponse'>;

export function QuantityPricePage() {
  const t = useTranslations('quantityPrice');
  const router = useRouter();
  const itemId = useSearchParams().get('item') ?? '';
  const [addingSize, setAddingSize] = useState(false);
  const [repacking, setRepacking] = useState<Level | null>(null);

  const item = useQuery({
    queryKey: ['products', 'simple', itemId],
    queryFn: () => request<Product>('GET', `/admin/products/${itemId}`),
    enabled: Boolean(itemId),
  });
  const levels = useQuery({
    queryKey: ['stock', 'item', itemId],
    queryFn: () =>
      request<{ items: Level[] }>('GET', '/admin/stock-levels', {
        query: { productId: itemId, limit: 100 },
      }),
    enabled: Boolean(itemId),
  });
  const levelsOf = (variantId: string) =>
    (levels.data?.items ?? []).filter((l) => l.variant.id === variantId);
  const stockOf = (variantId: string) =>
    levelsOf(variantId).reduce((sum, l) => sum + Number(l.onHand), 0);

  const product = item.data;
  const bought = product?.variants.some((v) => stockOf(v.id) > 0) ?? false;

  const stockedLevels = (product?.variants ?? []).flatMap((v) =>
    levelsOf(v.id)
      .filter((l) => Number(l.onHand) > 0)
      .slice(0, 1),
  );

  return (
    <div className="grid max-w-3xl gap-5">
      <section className="grid gap-4 rounded-xl border border-border bg-card p-5">
        <Field label={t('item')} htmlFor="qp-item" hint={t('itemHint')}>
          <SearchSelect
            id="qp-item"
            source={choices.buyItems}
            placeholder={t('itemSearch')}
            wrapValue
            value={itemId}
            onChange={(value) => router.replace(routes.quantityPrice(String(value) || undefined))}
          />
        </Field>
      </section>

      {itemId && item.isPending ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : null}
      {itemId && item.isError ? <p className="text-sm text-destructive">{t('notFound')}</p> : null}

      {product ? (
        <section className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold">{product.nameNe}</h2>
              <p className="text-sm text-muted-foreground">{product.nameEn}</p>
            </div>
            <Link
              href={routes.buy(product.id)}
              className={buttonVariants({ variant: 'secondary' })}
            >
              <Icon name="truck" size={16} />
              {bought ? t('buyMore') : t('buy')}
            </Link>
          </div>

          {!bought ? <p className="text-sm text-muted-foreground">{t('notBought')}</p> : null}

          {product.variants.length > 0 ? (
            <PriceForm
              key={product.variants.map((v) => `${v.id}:${v.price}:${v.isActive}`).join('|')}
              product={product}
              stockOf={stockOf}
            />
          ) : null}

          <section className="grid gap-3 rounded-xl border border-border bg-card p-4">
            <h3 className="font-heading text-base font-semibold">{t('guideTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('guideSmall')}</p>
            <p className="text-sm text-muted-foreground">{t('guideBig')}</p>
            <div className="flex flex-wrap gap-2">
              {stockedLevels.length > 0 ? (
                stockedLevels.map((level) => (
                  <Button
                    key={level.variant.id}
                    variant="secondary"
                    onClick={() => setRepacking(level)}
                  >
                    {t('cutPack', {
                      name: nameOf(
                        product.variants.find((v) => v.id === level.variant.id) ??
                          product.variants[0]!,
                      ),
                    })}
                  </Button>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">{t('buyFirstToCut')}</span>
              )}
              {addingSize ? null : (
                <Button variant="ghost" onClick={() => setAddingSize(true)}>
                  <Icon name="plus" size={14} />
                  {t('addSizes')}
                </Button>
              )}
            </div>
            {/* Open by itself while the item has no size yet, so sizes are set up before any buying. */}
            {addingSize || product.variants.length === 0 ? (
              <AddSizes product={product} onDone={() => setAddingSize(false)} />
            ) : null}
            <Link href={routes.itemPrices()} className="w-fit text-xs text-primary hover:underline">
              {t('allWaiting')}
            </Link>
          </section>
        </section>
      ) : null}

      {repacking ? <RepackForm level={repacking} onClose={() => setRepacking(null)} /> : null}
    </div>
  );
}
