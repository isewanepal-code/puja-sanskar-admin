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

type SizeRow = { amount: string; unitId: string; optionIds: string[]; price: string };
const blankSize = (): SizeRow => ({ amount: '', unitId: '', optionIds: [], price: '' });

// Several ways to sell the same item at once (200 g, 500 g, 1 kg), set up before anything is bought:
// each is a size with its price, ready to put stock into later.
export function AddSizes({ product, onDone }: { product: Product; onDone: () => void }) {
  const t = useTranslations('inventory.itemPage');
  const tq = useTranslations('quantityPrice');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<SizeRow[]>([blankSize(), blankSize()]);
  const [tried, setTried] = useState(false);
  const units = useQuery({
    queryKey: ['units-for', product.sellBy],
    queryFn: () => unitsFor(product.sellBy).load(),
  });
  const symbolOf = (id: string) => (units.data ?? []).find((u) => u.value === id)?.detail ?? '';
  const change = (i: number, patch: Partial<SizeRow>) =>
    setRows((all) => all.map((r, at) => (at === i ? { ...r, ...patch } : r)));
  const used = rows.filter((r) => r.amount.trim() || r.price.trim() || r.unitId);
  const rowProblem = (r: SizeRow): boolean =>
    !(Number(r.amount) > 0) || !r.unitId || !(Number(r.price) > 0) || Number(r.price) > 100_000_000;
  const problem =
    used.length === 0 ? tq('sizesNone') : used.some(rowProblem) ? tq('sizesFix') : null;

  const add = useMutation({
    mutationFn: async () => {
      for (const r of used) {
        const symbol = symbolOf(r.unitId);
        const label = `${Number(r.amount)} ${symbol}`.trim();
        await request('POST', `/admin/products/${product.id}/variants`, {
          body: {
            sku: `${product.code.replace(/_/g, '-')}-${Number(r.amount)}${symbol}`
              .toUpperCase()
              .replace(/[^A-Z0-9-]/g, '')
              .slice(0, 40),
            label,
            packQuantity: Number(r.amount),
            packUnitId: r.unitId,
            price: String(Number(r.price)),
            pricesIncludeTax: true,
            isActive: true,
            ...(r.optionIds.length > 0 && { optionValueIds: r.optionIds }),
          },
        });
      }
    },
    onSuccess: async () => {
      toast.success(tq('sizesAdded', { n: used.length }));
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      onDone();
    },
    onError: async (error) => {
      // The ones before the failing row were saved: show them, and say what stopped.
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.error(isApiError(error) ? error.message : tf('failed'));
    },
  });

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium">{tq('sizesTitle')}</p>
      <p className="text-xs text-muted-foreground">{tq('sizesNote')}</p>
      <div className="grid gap-2">
        {rows.map((r, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[7rem_9rem_12rem_9rem_auto] sm:items-end">
            <Field label={i === 0 ? t('sizeAmount') : ''} htmlFor={`sizes-a-${i}`}>
              <Input
                id={`sizes-a-${i}`}
                inputMode="decimal"
                aria-invalid={
                  tried && used.includes(r) && !(Number(r.amount) > 0) ? true : undefined
                }
                value={r.amount}
                placeholder={['200', '500', '1'][i] ?? ''}
                onChange={(e) => change(i, { amount: e.target.value })}
              />
            </Field>
            <Field label={i === 0 ? t('sizeUnit') : ''} htmlFor={`sizes-u-${i}`}>
              <SearchSelect
                id={`sizes-u-${i}`}
                source={unitsFor(product.sellBy)}
                invalid={tried && used.includes(r) && !r.unitId}
                value={r.unitId}
                onChange={(value) => change(i, { unitId: String(value) })}
              />
            </Field>
            <Field label={i === 0 ? t('sizeColour') : ''} htmlFor={`sizes-c-${i}`}>
              <SearchSelect
                id={`sizes-c-${i}`}
                multiple
                source={choices.optionValues}
                value={r.optionIds}
                placeholder="—"
                onChange={(value) => change(i, { optionIds: value as string[] })}
              />
            </Field>
            <Field label={i === 0 ? t('sizePrice') : ''} htmlFor={`sizes-p-${i}`}>
              <Input
                id={`sizes-p-${i}`}
                inputMode="decimal"
                aria-invalid={
                  tried && used.includes(r) && !(Number(r.price) > 0) ? true : undefined
                }
                value={r.price}
                placeholder={['70', '165', '320'][i] ?? ''}
                onChange={(e) => change(i, { price: e.target.value })}
              />
            </Field>
            <Button
              variant="ghost"
              size="sm"
              disabled={rows.length === 1}
              onClick={() => setRows((all) => all.filter((_, at) => at !== i))}
            >
              {tq('sizesRemove')}
            </Button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setRows((all) => [...all, blankSize()])}
        >
          {tq('sizesAnother')}
        </Button>
        <span className="flex-1" />
        {tried && problem ? (
          <span role="alert" className="text-xs text-destructive">
            {problem}
          </span>
        ) : null}
        <Button variant="secondary" onClick={onDone}>
          {tf('cancel')}
        </Button>
        <Button
          disabled={add.isPending}
          onClick={() => {
            if (problem) {
              setTried(true);
              return;
            }
            add.mutate();
          }}
        >
          {add.isPending ? tf('saving') : tq('sizesSave')}
        </Button>
      </div>
    </div>
  );
}
