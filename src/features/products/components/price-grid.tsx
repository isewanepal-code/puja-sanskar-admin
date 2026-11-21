'use client';

import { SearchSelect } from '@/components/controls';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { useToast } from '@/components/overlays';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError, request } from '@/lib/api';
import { formatMoney } from '@/lib/format';

import type { Product } from './use-product';

type Edit = { price?: string; compareAtPrice?: string; isActive?: boolean };
const AMOUNT = /^\d{1,13}(\.\d{1,2})?$/;

// Every pack of the item in one table with its price in a box: change a price, or give a whole
// colour, size or quality one price at once, then save.
export function PriceGrid({ product }: { product: Product }) {
  const t = useTranslations('priceGrid');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [target, setTarget] = useState('');
  const [bulk, setBulk] = useState('');

  const rows = useMemo(
    () => [...product.variants].sort((a, b) => a.label.localeCompare(b.label)),
    [product.variants],
  );
  // The values packs can be chosen by, headed by their kind: "Colour: White".
  const values = product.options.flatMap((option) =>
    option.values.map((value) => ({
      id: value.valueId,
      label: `${option.nameEn}: ${value.valueEn}`,
    })),
  );

  const valueOf = (id: string, field: 'price' | 'compareAtPrice') => {
    const variant = rows.find((row) => row.id === id)!;
    return (
      edits[id]?.[field] ?? (field === 'price' ? variant.price : (variant.compareAtPrice ?? ''))
    );
  };
  const set = (id: string, field: 'price' | 'compareAtPrice', value: string) =>
    setEdits((was) => ({ ...was, [id]: { ...was[id], [field]: value } }));

  // Margin on the price before VAT, when the shop knows what the pack cost it.
  const rate = Number(product.effectiveTax.ratePercent ?? 0);
  const marginOf = (id: string) => {
    const variant = rows.find((row) => row.id === id)!;
    const price = Number(valueOf(id, 'price'));
    const cost = variant.cost ? Number(variant.cost) : null;
    if (cost === null || !(price > 0)) return null;
    const net = price / (1 + rate / 100);
    return Math.round(((net - cost) / net) * 100);
  };

  const activeOf = (id: string) =>
    edits[id]?.isActive ?? rows.find((row) => row.id === id)?.isActive ?? true;

  const bad = (id: string) => {
    const price = valueOf(id, 'price');
    const was = valueOf(id, 'compareAtPrice');
    if (!AMOUNT.test(price) || Number(price) <= 0) return t('badPrice');
    if (was && (!AMOUNT.test(was) || Number(was) <= Number(price))) return t('badCompare');
    return null;
  };
  const changed = Object.keys(edits).filter((id) => {
    const variant = rows.find((row) => row.id === id);
    return (
      variant &&
      (valueOf(id, 'price') !== variant.price ||
        valueOf(id, 'compareAtPrice') !== (variant.compareAtPrice ?? '') ||
        activeOf(id) !== variant.isActive)
    );
  });
  const problem = changed.map((id) => bad(id)).find(Boolean);

  const applyToMatching = () => {
    if (!target || !AMOUNT.test(bulk)) return;
    setEdits((was) => {
      const next = { ...was };
      for (const row of rows) {
        if (row.options.some((option) => option.valueId === target)) {
          next[row.id] = { ...next[row.id], price: bulk };
        }
      }
      return next;
    });
  };

  const save = useMutation({
    mutationFn: async () => {
      for (const id of changed) {
        await request('PATCH', `/admin/products/${product.id}/variants/${id}`, {
          body: {
            price: valueOf(id, 'price'),
            compareAtPrice: valueOf(id, 'compareAtPrice') || null,
            isActive: activeOf(id),
          },
        });
      }
    },
    onSuccess: async () => {
      toast.success(t('saved', { count: changed.length }));
      setEdits({});
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{t('note')}</p>

      {values.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="grid gap-1 text-xs">
            {t('forAll')}
            <SearchSelect
              aria-label={t('forAll')}
              className="min-w-48"
              options={values.map((value) => ({ value: value.id, label: value.label }))}
              placeholder={t('choose')}
              value={target}
              onChange={(value) => setTarget(String(value))}
            />
          </div>
          <label className="grid gap-1 text-xs">
            {t('price')}
            <Input
              className="w-28"
              inputMode="decimal"
              placeholder="e.g. 500"
              value={bulk}
              onChange={(event) => setBulk(event.target.value)}
            />
          </label>
          <Button
            variant="secondary"
            onClick={applyToMatching}
            disabled={!target || !AMOUNT.test(bulk)}
          >
            {t('apply')}
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2">{t('pack')}</th>
              <th className="px-3 py-2">{t('sku')}</th>
              <th className="w-32 px-3 py-2">{t('priceCol')}</th>
              <th className="w-32 px-3 py-2">{t('was')}</th>
              <th className="px-3 py-2">{t('cost')}</th>
              <th className="px-3 py-2">{t('margin')}</th>
              <th className="px-3 py-2">{t('boughtFrom')}</th>
              <th className="px-3 py-2">{t('stock')}</th>
              <th className="px-3 py-2">{t('onSale')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const edited = changed.includes(row.id);
              const message = edited ? bad(row.id) : null;
              return (
                <tr key={row.id} className={edited ? 'bg-primary/5' : undefined}>
                  <td className="border-t border-border px-3 py-2">
                    <div className="font-medium">{row.label}</div>
                    {!row.isActive ? <Badge tone="warning">{t('off')}</Badge> : null}
                  </td>
                  <td className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                    {row.sku}
                  </td>
                  <td className="border-t border-border px-3 py-2">
                    <Input
                      inputMode="decimal"
                      aria-label={`${t('priceCol')} ${row.label}`}
                      aria-invalid={message ? true : undefined}
                      value={valueOf(row.id, 'price')}
                      onChange={(event) => set(row.id, 'price', event.target.value)}
                    />
                  </td>
                  <td className="border-t border-border px-3 py-2">
                    <Input
                      inputMode="decimal"
                      placeholder="—"
                      aria-label={`${t('was')} ${row.label}`}
                      value={valueOf(row.id, 'compareAtPrice')}
                      onChange={(event) => set(row.id, 'compareAtPrice', event.target.value)}
                    />
                  </td>
                  <td className="border-t border-border px-3 py-2 whitespace-nowrap">
                    {row.cost ? (
                      formatMoney(row.cost, 'en')
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="border-t border-border px-3 py-2 whitespace-nowrap">
                    {marginOf(row.id) === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Badge tone={(marginOf(row.id) ?? 0) < 10 ? 'warning' : 'success'}>
                        {marginOf(row.id)}%
                      </Badge>
                    )}
                  </td>
                  <td className="border-t border-border px-3 py-2 text-xs">
                    {row.lastBought ? (
                      <>
                        <div className="font-medium">{row.lastBought.supplierName}</div>
                        <div className="text-muted-foreground">
                          {formatMoney(row.lastBought.unitCost, 'en')} · {row.lastBought.billDay}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="border-t border-border px-3 py-2">
                    <Badge tone={row.inStock ? 'success' : 'warning'}>
                      {row.inStock ? t('inStock') : t('noStock')}
                    </Badge>
                  </td>
                  <td className="border-t border-border px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      className="size-4"
                      aria-label={`${t('onSale')} ${row.label}`}
                      checked={activeOf(row.id)}
                      onChange={(event) =>
                        setEdits((was) => ({
                          ...was,
                          [row.id]: { ...was[row.id], isActive: event.target.checked },
                        }))
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => save.mutate()}
          disabled={changed.length === 0 || !!problem || save.isPending}
        >
          {save.isPending ? tf('saving') : t('save', { count: changed.length })}
        </Button>
        {changed.length > 0 ? (
          <button
            type="button"
            className="text-sm text-muted-foreground hover:underline"
            onClick={() => setEdits({})}
          >
            {t('undo')}
          </button>
        ) : null}
        {problem ? <span className="text-sm text-destructive">{problem}</span> : null}
      </div>
    </div>
  );
}
