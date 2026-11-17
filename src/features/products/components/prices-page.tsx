'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { cn } from '@/lib/utils';

type Product = Schema<'AdminProductResponse'>;
type Page = { items: Product[] };
type Edit = { price?: string; on?: boolean };

const AMOUNT = /^\d{1,13}(\.\d{1,2})?$/;

// Step 3: what the shop sells each bought pack for. Packs made by a purchase wait here, off sale,
// with what they cost; type the price and tick On sale. Every other pack can be repriced here too.
export function PricesPage() {
  const t = useTranslations('pricesPage');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const products = useQuery({
    queryKey: ['products', 'prices'],
    queryFn: () =>
      request<Page>('GET', '/admin/products', { query: { limit: 100, sort: 'NEWEST' } }),
  });

  const rows = (products.data?.items ?? []).flatMap((product) =>
    product.variants.map((variant) => ({ product, variant })),
  );
  const waiting = rows.filter(({ variant }) => !variant.isActive);
  const shown = showAll ? rows : waiting;
  const priceOf = (id: string, was: string) => edits[id]?.price ?? was;
  const onOf = (id: string, was: boolean) => edits[id]?.on ?? was;
  const set = (id: string, patch: Edit) =>
    setEdits((all) => ({ ...all, [id]: { ...all[id], ...patch } }));
  const changed = shown.filter(({ variant }) => {
    const e = edits[variant.id];
    return e && (e.price !== undefined || e.on !== undefined);
  });
  const bad = (variantId: string, was: string) => {
    const price = priceOf(variantId, was);
    return !AMOUNT.test(price) || Number(price) <= 0;
  };
  const problem = changed.some(({ variant }) => bad(variant.id, variant.price));

  const save = useMutation({
    mutationFn: async () => {
      for (const { product, variant } of changed) {
        await request('PATCH', `/admin/products/${product.id}/variants/${variant.id}`, {
          body: {
            price: priceOf(variant.id, variant.price),
            isActive: onOf(variant.id, variant.isActive),
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
    <>
      <p className="text-sm text-muted-foreground">{t('note')}</p>

      <div className="flex flex-wrap items-center gap-2">
        {[false, true].map((all) => (
          <button
            key={String(all)}
            type="button"
            aria-pressed={showAll === all}
            onClick={() => setShowAll(all)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm font-medium',
              showAll === all
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {all ? t('all', { count: rows.length }) : t('waiting', { count: waiting.length })}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
            <tr>
              <th className="sticky left-0 z-10 bg-muted px-3 py-2 text-left font-semibold">
                {t('pack')}
              </th>
              <th className="px-3 py-2 text-right font-semibold">{t('cost')}</th>
              <th className="w-36 px-3 py-2 font-semibold">{t('price')}</th>
              <th className="px-3 py-2 text-right font-semibold">{t('margin')}</th>
              <th className="px-3 py-2 text-center font-semibold">{t('onSale')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  {products.isPending ? '…' : t('empty')}{' '}
                  <Link href={routes.newPurchase()} className="text-primary underline">
                    {t('goBuy')}
                  </Link>
                </td>
              </tr>
            ) : (
              shown.map(({ product, variant }) => {
                const price = priceOf(variant.id, variant.price);
                const cost = variant.cost ? Number(variant.cost) : null;
                const margin =
                  cost !== null && Number(price) > 0
                    ? Math.round(((Number(price) - cost) / Number(price)) * 100)
                    : null;
                const dirty = changed.some((c) => c.variant.id === variant.id);
                return (
                  <tr key={variant.id} className={dirty ? 'bg-primary/5' : undefined}>
                    <td className="sticky left-0 z-[5] border-t border-border bg-card px-3 py-2">
                      <div className="font-medium">{product.nameNe}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.nameEn} · {variant.label}
                        {!variant.isActive ? (
                          <Badge tone="warning" className="ml-2">
                            {t('notYet')}
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="border-t border-border px-3 py-2 text-right whitespace-nowrap">
                      {cost !== null ? formatMoney(String(cost), 'en') : '—'}
                    </td>
                    <td className="border-t border-border px-3 py-2">
                      <Input
                        inputMode="decimal"
                        aria-label={`${t('price')} ${variant.label}`}
                        value={price}
                        onChange={(e) =>
                          set(variant.id, {
                            price: e.target.value,
                            on: edits[variant.id]?.on ?? true,
                          })
                        }
                      />
                    </td>
                    <td className="border-t border-border px-3 py-2 text-right whitespace-nowrap">
                      {margin !== null ? `${margin}%` : '—'}
                    </td>
                    <td className="border-t border-border px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        className="size-4"
                        aria-label={`${t('onSale')} ${variant.label}`}
                        checked={onOf(variant.id, variant.isActive)}
                        onChange={(e) => set(variant.id, { on: e.target.checked })}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={problem ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
          {problem ? t('badPrice') : t('hint')}
        </p>
        <Button
          disabled={changed.length === 0 || problem || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? tf('saving') : t('save', { count: changed.length })}
        </Button>
      </div>
    </>
  );
}
