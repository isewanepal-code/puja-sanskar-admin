'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useToast } from '@/components/overlays';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError, request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';

import { nameOf } from './pack-rows';

type Product = Schema<'AdminProductResponse'>;

export function PriceForm({
  product,
  stockOf,
}: {
  product: Product;
  stockOf: (variantId: string) => number;
}) {
  const t = useTranslations('quantityPrice');
  const ti = useTranslations('inventory.itemPage');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();

  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.variants.map((v) => [v.id, String(Number(v.price))])),
  );
  const [onSale, setOnSale] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(product.variants.map((v) => [v.id, v.isActive])),
  );

  const changed = product.variants.filter(
    (v) => Number(prices[v.id]) !== Number(v.price) || onSale[v.id] !== v.isActive,
  );
  const invalid = changed.some((v) => onSale[v.id] && !(Number(prices[v.id]) > 0));

  const save = useMutation({
    mutationFn: () =>
      Promise.all(
        changed.map((v) =>
          request('PATCH', `/admin/products/${product.id}/variants/${v.id}`, {
            body: {
              price: String(Number(prices[v.id])),
              pricesIncludeTax: true,
              isActive: Boolean(onSale[v.id]),
            },
          }),
        ),
      ),
    onSuccess: async () => {
      toast.success(t('saved'));
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (changed.length > 0 && !invalid) save.mutate();
      }}
    >
      <p className="text-sm text-muted-foreground">{t('helpLine')}</p>

      <ul className="grid gap-3">
        {product.variants.map((v) => {
          const stock = stockOf(v.id);
          const unit = v.label || v.pack?.unit.symbol || '';
          const rowInvalid = onSale[v.id] && !(Number(prices[v.id]) > 0);
          const waiting = !(Number(v.price) > 0);
          return (
            <li
              key={v.id}
              className={`grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-center ${waiting ? 'border-warning' : 'border-border'}`}
            >
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 font-medium">
                  {v.options.map((o) =>
                    o.colorHex ? (
                      <span
                        key={o.valueId}
                        className="inline-block size-3 rounded-full border border-border"
                        style={{ background: o.colorHex }}
                      />
                    ) : null,
                  )}
                  {nameOf(v)}
                  {waiting ? <Badge tone="warning">{t('needsPrice')}</Badge> : null}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {stock > 0 ? (
                    ti('stockCount', { n: stock, unit })
                  ) : (
                    <Link href={routes.buy(product.id)} className="text-destructive underline">
                      {ti('noStockBuy')}
                    </Link>
                  )}
                  {v.cost ? ` · ${t('costOf', { amount: formatMoney(v.cost, 'en') })}` : ''}
                </p>
              </div>

              <label className="grid gap-1 text-xs text-muted-foreground">
                {t('colPrice')}
                <span className="flex items-center gap-2">
                  <span>Rs</span>
                  <Input
                    inputMode="decimal"
                    value={prices[v.id]}
                    aria-invalid={rowInvalid || undefined}
                    aria-label={ti('sellPriceOf', { name: nameOf(v) })}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPrices((p) => ({ ...p, [v.id]: value }));
                      if (Number(value) > 0 && !v.isActive)
                        setOnSale((s) => ({ ...s, [v.id]: true }));
                    }}
                    className="text-right text-base text-foreground"
                  />
                </span>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={Boolean(onSale[v.id])}
                  onChange={(e) => setOnSale((s) => ({ ...s, [v.id]: e.target.checked }))}
                />
                {t('colSale')}
              </label>
            </li>
          );
        })}
      </ul>

      {invalid ? <p className="text-sm text-destructive">{t('needPrice')}</p> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={changed.length === 0 || invalid || save.isPending}>
          {save.isPending ? tf('saving') : t('save')}
        </Button>
        {changed.length === 0 ? (
          <span className="text-xs text-muted-foreground">{t('nothingChanged')}</span>
        ) : null}
      </div>
    </form>
  );
}
