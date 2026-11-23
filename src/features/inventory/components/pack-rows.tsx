'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { useToast } from '@/components/overlays';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { unitsFor } from '@/features/products';
import { isApiError, request, type Schema } from '@/lib/api';
import { choices } from '@/lib/choices';
import { formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';

type Product = Schema<'AdminProductResponse'>;
type Variant = Schema<'AdminVariantResponse'>;

const money = (amount: string | null | undefined) => (amount ? formatMoney(amount, 'en') : '—');

// What one way of selling the item is called: its colours and sizes, else its amount (1 set, 50 g).
export const nameOf = (v: Variant) =>
  v.options.length ? v.options.map((o) => o.valueEn).join(' · ') : v.label;

// One way the item is sold: how much is in stock, and its selling price, changed right here.
export function VariantRow({
  product,
  variant,
  stock,
  onRepack,
}: {
  product: Product;
  variant: Variant;
  stock: number;
  // Opens the form that makes smaller packs from this one (only where there is stock to open).
  onRepack?: () => void;
}) {
  const t = useTranslations('inventory.itemPage');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [price, setPrice] = useState(String(Number(variant.price)));
  const changed = Number(price) !== Number(variant.price) || !variant.isActive;
  const save = useMutation({
    mutationFn: (onSale: boolean) =>
      request('PATCH', `/admin/products/${product.id}/variants/${variant.id}`, {
        body: { price: String(Number(price)), pricesIncludeTax: true, isActive: onSale },
      }),
    onSuccess: async (_d, onSale) => {
      toast.success(onSale ? t('priceSaved') : t('offSale'));
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });
  const unit = variant.label || variant.pack?.unit.symbol || '';

  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2.5">
        <span className="inline-flex items-center gap-2 font-medium">
          {variant.options.map((o) =>
            o.colorHex ? (
              <span
                key={o.valueId}
                className="inline-block size-3 rounded-full border border-border"
                style={{ background: o.colorHex }}
              />
            ) : null,
          )}
          {nameOf(variant)}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {stock > 0 ? (
          <div className="grid justify-items-end gap-1">
            <span className="font-semibold">{t('stockCount', { n: stock, unit })}</span>
            {onRepack ? (
              <button
                type="button"
                onClick={onRepack}
                className="text-xs text-primary hover:underline"
              >
                {t('makeSmaller')}
              </button>
            ) : null}
          </div>
        ) : (
          <Link href={routes.buy(product.id)} className="text-destructive underline">
            {t('noStockBuy')}
          </Link>
        )}
      </td>
      <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">
        {money(variant.cost)}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">Rs</span>
          <Input
            aria-label={t('sellPriceOf', { name: nameOf(variant) })}
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-28 text-right"
          />
          <Button
            size="sm"
            disabled={!changed || !(Number(price) > 0) || save.isPending}
            onClick={() => save.mutate(true)}
          >
            {variant.isActive ? tf('save') : t('putOnSale')}
          </Button>
        </div>
      </td>
      <td className="px-3 py-2.5 text-center">
        {variant.isActive ? (
          <button
            type="button"
            title={t('takeOffSale')}
            onClick={() => save.mutate(false)}
            disabled={save.isPending}
          >
            <Badge tone="success">{t('onSale')}</Badge>
          </button>
        ) : (
          <Badge tone="warning">{t('notOnSale')}</Badge>
        )}
      </td>
    </tr>
  );
}

// Another way to sell the same item (a 2 kg bag next to 1 kg): how much, which unit, and its price.
export function AddSize({ product, onDone }: { product: Product; onDone: () => void }) {
  const t = useTranslations('inventory.itemPage');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [unitId, setUnitId] = useState('');
  const [price, setPrice] = useState('');
  // Optional: this size is of a colour or size the item comes in (red, large).
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const units = useQuery({
    queryKey: ['units-for', product.sellBy],
    queryFn: () => unitsFor(product.sellBy).load(),
  });
  const symbol = (units.data ?? []).find((u) => u.value === unitId)?.detail ?? '';
  const label = `${Number(amount)} ${symbol}`.trim();
  const add = useMutation({
    mutationFn: () =>
      request('POST', `/admin/products/${product.id}/variants`, {
        body: {
          sku: `${product.code.replace(/_/g, '-')}-${Number(amount)}${symbol}`
            .toUpperCase()
            .replace(/[^A-Z0-9-]/g, '')
            .slice(0, 40),
          label,
          packQuantity: Number(amount),
          packUnitId: unitId,
          price: String(Number(price)),
          pricesIncludeTax: true,
          isActive: true,
          ...(optionIds.length > 0 && { optionValueIds: optionIds }),
        },
      }),
    onSuccess: async () => {
      toast.success(t('sizeAdded', { label }));
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      onDone();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });
  const ready = Number(amount) > 0 && unitId && Number(price) > 0;

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[7rem_9rem_12rem_9rem_auto] sm:items-end">
      <Field label={t('sizeAmount')} htmlFor="size-amount">
        <Input
          id="size-amount"
          inputMode="decimal"
          value={amount}
          placeholder="2"
          autoFocus
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <Field label={t('sizeUnit')} htmlFor="size-unit">
        <SearchSelect
          id="size-unit"
          source={unitsFor(product.sellBy)}
          value={unitId}
          onChange={(value) => setUnitId(String(value))}
        />
      </Field>
      <Field label={t('sizeColour')} htmlFor="size-colour">
        <SearchSelect
          id="size-colour"
          multiple
          source={choices.optionValues}
          value={optionIds}
          placeholder="—"
          onChange={(value) => setOptionIds(value as string[])}
        />
      </Field>
      <Field label={t('sizePrice')} htmlFor="size-price">
        <Input
          id="size-price"
          inputMode="decimal"
          value={price}
          placeholder="250"
          onChange={(e) => setPrice(e.target.value)}
        />
      </Field>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onDone}>
          {tf('cancel')}
        </Button>
        <Button disabled={!ready || add.isPending} onClick={() => add.mutate()}>
          {add.isPending ? tf('saving') : t('sizeSave')}
        </Button>
      </div>
    </div>
  );
}
