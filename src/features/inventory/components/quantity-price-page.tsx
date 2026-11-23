'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { unitsFor } from '@/features/products';
import { isApiError, request, type Schema } from '@/lib/api';
import { choices } from '@/lib/choices';
import { formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';
import { useUnsavedGuard } from '@/lib/use-unsaved-guard';

import { nameOf } from './pack-rows';

type Product = Schema<'AdminProductResponse'>;
type Variant = Schema<'AdminVariantResponse'>;

// One line of the table: a quantity the item is sold in, with its price. A line that has an id
// already exists (it came from the Excel or an earlier save); one without is new.
type Row = {
  key: string;
  id?: string;
  amount: string;
  unitId: string;
  optionIds: string[];
  price: string;
  onSale: boolean;
  onWeb: boolean;
  removed: boolean;
};

let counter = 0;
const blank = (): Row => ({
  key: `new-${(counter += 1)}`,
  amount: '',
  unitId: '',
  optionIds: [],
  price: '',
  onSale: true,
  onWeb: true,
  removed: false,
});

const rowOf = (v: Variant): Row => ({
  key: v.id,
  id: v.id,
  amount: '',
  unitId: '',
  optionIds: [],
  price: Number(v.price) > 0 ? String(Number(v.price)) : '',
  onSale: v.isActive,
  onWeb: v.showOnWebsite,
  removed: false,
});

const touched = (r: Row) => !r.id && Boolean(r.amount.trim() || r.price.trim() || r.unitId);

export function QuantityPricePage() {
  const router = useRouter();
  const t = useTranslations('quantityPrice');
  const itemId = useSearchParams().get('item') ?? '';

  const item = useQuery({
    queryKey: ['products', 'simple', itemId],
    queryFn: () => request<Product>('GET', `/admin/products/${itemId}`),
    enabled: Boolean(itemId),
  });
  const product = item.data;

  return (
    <div className="grid max-w-4xl gap-5">
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
        // Starts again from the saved item whenever it changes, so the table always shows what is saved.
        <Editor
          key={`${product.id}:${product.variants.map((v) => `${v.id}:${v.price}:${v.isActive}:${v.showOnWebsite}`).join('|')}`}
          product={product}
        />
      ) : null}
    </div>
  );
}

function Editor({ product }: { product: Product }) {
  const t = useTranslations('quantityPrice');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>(() =>
    product.variants.length > 0 ? product.variants.map(rowOf) : [blank()],
  );
  const [tried, setTried] = useState(false);
  const units = useQuery({
    queryKey: ['units-for', product.sellBy],
    queryFn: () => unitsFor(product.sellBy).load(),
  });
  const symbolOf = (id: string) => (units.data ?? []).find((u) => u.value === id)?.detail ?? '';
  const variantOf = (id?: string) => product.variants.find((v) => v.id === id);

  const change = (key: string, patch: Partial<Row>) =>
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const live = rows.filter((r) => !r.removed);
  const badPrice = (r: Row) => !(Number(r.price) > 0) || Number(r.price) > 100_000_000;
  const rowBad = (r: Row): boolean => {
    if (r.id) return r.onSale && badPrice(r);
    if (!touched(r)) return false;
    return !(Number(r.amount) > 0) || !r.unitId || badPrice(r);
  };
  const problem = live.some(rowBad);

  const changedExisting = rows.filter((r) => {
    const v = variantOf(r.id);
    if (!v || r.removed) return false;
    return (
      (r.price.trim() !== '' && Number(r.price) !== Number(v.price)) ||
      r.onSale !== v.isActive ||
      r.onWeb !== v.showOnWebsite
    );
  });
  const removing = rows.filter((r) => r.id && r.removed);
  const adding = live.filter(touched);
  const count = changedExisting.length + removing.length + adding.length;

  const save = useMutation({
    mutationFn: async () => {
      for (const r of removing) {
        await request('DELETE', `/admin/products/${product.id}/variants/${r.id}`);
      }
      for (const r of changedExisting) {
        await request('PATCH', `/admin/products/${product.id}/variants/${r.id}`, {
          body: {
            ...(r.price.trim() !== '' && { price: String(Number(r.price)) }),
            pricesIncludeTax: true,
            isActive: r.onSale,
            showOnWebsite: r.onWeb,
          },
        });
      }
      for (const r of adding) {
        const symbol = symbolOf(r.unitId);
        await request('POST', `/admin/products/${product.id}/variants`, {
          body: {
            sku: `${product.code.replace(/_/g, '-')}-${Number(r.amount)}${symbol}`
              .toUpperCase()
              .replace(/[^A-Z0-9-]/g, '')
              .slice(0, 40),
            label: `${Number(r.amount)} ${symbol}`.trim(),
            packQuantity: Number(r.amount),
            packUnitId: r.unitId,
            price: String(Number(r.price)),
            pricesIncludeTax: true,
            isActive: r.onSale,
            showOnWebsite: r.onWeb,
            ...(r.optionIds.length > 0 && { optionValueIds: r.optionIds }),
          },
        });
      }
    },
    onSuccess: async () => {
      toast.success(t('saved'));
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: async (error) => {
      // What was saved before the failing line shows now; the message says what stopped.
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.error(isApiError(error) ? error.message : tf('failed'));
    },
  });

  const guard = useUnsavedGuard(count > 0 && !save.isPending);
  const image = product.images[0]?.url;
  const checkbox = 'size-4 accent-primary';

  return (
    <section className="grid gap-4">
      {guard}
      <div className="flex items-center gap-4">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="size-16 shrink-0 rounded-lg border border-border object-cover"
          />
        ) : (
          <span className="size-16 shrink-0 rounded-lg border border-dashed border-border bg-muted" />
        )}
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold">{product.nameNe}</h2>
          <p className="text-sm text-muted-foreground">{product.nameEn}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">{t('colQuantity')}</th>
              <th className="w-40 px-3 py-2 text-right font-semibold">{t('colPrice')}</th>
              <th className="px-3 py-2 text-center font-semibold">{t('colSale')}</th>
              <th className="px-3 py-2 text-center font-semibold">{t('colWeb')}</th>
              <th className="w-24 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const v = variantOf(r.id);
              const invalid = tried && rowBad(r);
              return (
                <tr key={r.key} className={r.removed ? 'opacity-50' : undefined}>
                  <td className="border-t border-border px-3 py-2.5 align-middle">
                    {v ? (
                      <div className={r.removed ? 'line-through' : undefined}>
                        <span className="inline-flex items-center gap-2 font-medium">
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
                        </span>
                        {v.cost ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {t('costOf', { amount: formatMoney(v.cost, 'en') })}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-[6rem_9rem_11rem]">
                        <Input
                          inputMode="decimal"
                          aria-label={t('amount')}
                          placeholder={t('amount')}
                          aria-invalid={invalid && !(Number(r.amount) > 0) ? true : undefined}
                          value={r.amount}
                          onChange={(e) => change(r.key, { amount: e.target.value })}
                        />
                        <SearchSelect
                          aria-label={t('unit')}
                          source={unitsFor(product.sellBy)}
                          placeholder={t('unit')}
                          invalid={invalid && !r.unitId}
                          value={r.unitId}
                          onChange={(value) => change(r.key, { unitId: String(value) })}
                        />
                        <SearchSelect
                          multiple
                          aria-label={t('colour')}
                          source={choices.optionValues}
                          placeholder={t('colour')}
                          value={r.optionIds}
                          onChange={(value) => change(r.key, { optionIds: value as string[] })}
                        />
                      </div>
                    )}
                  </td>
                  <td className="border-t border-border px-3 py-2.5 align-middle">
                    <span className="flex items-center justify-end gap-2">
                      <span className="text-xs text-muted-foreground">Rs</span>
                      <Input
                        inputMode="decimal"
                        disabled={r.removed}
                        aria-label={t('priceOf', { name: v ? nameOf(v) : String(i + 1) })}
                        aria-invalid={invalid && badPrice(r) ? true : undefined}
                        value={r.price}
                        onChange={(e) => change(r.key, { price: e.target.value })}
                        className="w-28 text-right"
                      />
                    </span>
                  </td>
                  <td className="border-t border-border px-3 py-2.5 text-center align-middle">
                    <input
                      type="checkbox"
                      className={checkbox}
                      disabled={r.removed}
                      aria-label={t('colSale')}
                      checked={r.onSale}
                      onChange={(e) => change(r.key, { onSale: e.target.checked })}
                    />
                  </td>
                  <td className="border-t border-border px-3 py-2.5 text-center align-middle">
                    <input
                      type="checkbox"
                      className={checkbox}
                      disabled={r.removed || !r.onSale}
                      aria-label={t('colWeb')}
                      checked={r.onSale && r.onWeb}
                      onChange={(e) => change(r.key, { onWeb: e.target.checked })}
                    />
                  </td>
                  <td className="border-t border-border px-3 py-2.5 text-right align-middle">
                    {r.removed ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => change(r.key, { removed: false })}
                      >
                        {t('undo')}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={rows.length === 1 && !r.id}
                        onClick={() =>
                          r.id
                            ? change(r.key, { removed: true })
                            : setRows((all) => all.filter((x) => x.key !== r.key))
                        }
                      >
                        {t('remove')}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <Button variant="secondary" size="sm" onClick={() => setRows((all) => [...all, blank()])}>
          {t('addRow')}
        </Button>
      </div>

      {removing.length > 0 ? <p className="text-xs text-warning">{t('removeNote')}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          role={tried && problem ? 'alert' : undefined}
          className={
            tried && problem ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'
          }
        >
          {tried && problem ? t('fixRows') : count === 0 ? t('nothingChanged') : t('helpLine')}
        </p>
        <Button
          disabled={count === 0 || save.isPending}
          onClick={() => {
            if (problem) {
              setTried(true);
              return;
            }
            save.mutate();
          }}
        >
          {save.isPending ? tf('saving') : t('save')}
        </Button>
      </div>
    </section>
  );
}
