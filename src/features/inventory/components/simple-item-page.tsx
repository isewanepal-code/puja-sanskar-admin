'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Field } from '@/components/forms';
import { Icon } from '@/components/icons';
import { ConfirmDialog, useToast } from '@/components/overlays';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTestModeOn } from '@/hooks/use-test-mode';
import { isApiError, request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';

type Product = Schema<'AdminProductResponse'>;
type Variant = Schema<'AdminVariantResponse'>;
type Level = Schema<'StockLevelResponse'>;

const money = (amount: string | null | undefined) => (amount ? formatMoney(amount, 'en') : '—');

// What one colour/size of the item is called: its colours and sizes, else its pack name.
const nameOf = (v: Variant) =>
  v.options.length ? v.options.map((o) => o.valueEn).join(' · ') : v.label;

// One colour or size: how much is in stock, and its selling price, changed right here.
function VariantRow({
  product,
  variant,
  stock,
}: {
  product: Product;
  variant: Variant;
  stock: number;
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
  const unit = variant.pack?.unit.symbol ?? '';

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
        <span className={stock > 0 ? 'font-semibold' : 'text-destructive'}>
          {stock} {unit}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">
        {money(variant.cost)}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-2">
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

// An item in plain words: its names, what is in stock in each colour or size, and what each sells for.
// Everything else (photos, offers, website text, packets) is on the advanced page.
export function SimpleItemPage({ id }: { id: string }) {
  const t = useTranslations('inventory.itemPage');
  const tf = useTranslations('forms');
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const testMode = useTestModeOn();
  const [editing, setEditing] = useState(false);
  const [names, setNames] = useState({ nameNe: '', nameEn: '' });
  const [removing, setRemoving] = useState(false);

  const item = useQuery({
    queryKey: ['products', 'simple', id],
    queryFn: () => request<Product>('GET', `/admin/products/${id}`),
  });
  const levels = useQuery({
    queryKey: ['stock', 'item', id],
    queryFn: () =>
      request<{ items: Level[] }>('GET', '/admin/stock-levels', {
        query: { productId: id, limit: 100 },
      }),
  });
  // Every branch shown adds up, so "all branches" shows the shop's whole stock.
  const stockOf = (variantId: string) =>
    (levels.data?.items ?? [])
      .filter((l) => l.variant.id === variantId)
      .reduce((sum, l) => sum + Number(l.onHand), 0);

  const rename = useMutation({
    mutationFn: (product: Product) =>
      request('PATCH', `/admin/products/${id}`, {
        body: {
          nameNe: names.nameNe.trim(),
          nameEn: names.nameEn.trim(),
          sellBy: product.sellBy,
          isActive: product.isActive,
          allowDuplicateName: true,
        },
      }),
    onSuccess: async () => {
      toast.success(t('namesSaved'));
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });
  const remove = useMutation({
    mutationFn: () => request('DELETE', `/admin/products/${id}`),
    onSuccess: async () => {
      toast.success(tf('deleted'));
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      router.push(routes.products());
    },
    onError: (error) => {
      setRemoving(false);
      toast.error(isApiError(error) ? error.message : tf('failed'));
    },
  });

  if (item.isPending) return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  if (item.isError || !item.data)
    return <p className="text-sm text-destructive">{t('notFound')}</p>;
  const product = item.data;
  const variants = product.variants;

  return (
    <div className="grid max-w-5xl gap-6">
      <div>
        <Link
          href={routes.products()}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {t('back')}
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold">{product.nameNe}</h1>
            <p className="text-sm text-muted-foreground">
              {product.nameEn} · {t(`sellBy.${product.sellBy}`)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={routes.buy(product.id)} className={buttonVariants({ variant: 'primary' })}>
              <Icon name="truck" size={16} />
              {t('buyMore')}
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                setNames({ nameNe: product.nameNe, nameEn: product.nameEn });
                setEditing(true);
              }}
            >
              <Icon name="edit" size={16} />
              {t('editNames')}
            </Button>
            <Link
              href={`${routes.item(product.id)}?step=basics`}
              className={buttonVariants({ variant: 'ghost' })}
              title={t('advancedHelp')}
            >
              {t('advanced')}
            </Link>
          </div>
        </div>
      </div>

      {editing ? (
        <section className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
          <Field label={`${t('nameNe')} *`} htmlFor="item-name-ne">
            <Input
              id="item-name-ne"
              value={names.nameNe}
              maxLength={160}
              onChange={(e) => setNames({ ...names, nameNe: e.target.value })}
            />
          </Field>
          <Field label={`${t('nameEn')} *`} htmlFor="item-name-en">
            <Input
              id="item-name-en"
              value={names.nameEn}
              maxLength={160}
              onChange={(e) => setNames({ ...names, nameEn: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="secondary" onClick={() => setEditing(false)}>
              {tf('cancel')}
            </Button>
            <Button
              disabled={!names.nameNe.trim() || !names.nameEn.trim() || rename.isPending}
              onClick={() => rename.mutate(product)}
            >
              {rename.isPending ? tf('saving') : tf('save')}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold">{t('stockTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('stockNote')}</p>
        </div>
        {variants.length === 0 ? (
          <div className="grid justify-items-start gap-3 rounded-xl border border-dashed border-border bg-card p-6">
            <p className="text-sm">{t('notBought')}</p>
            <Link href={routes.buy(product.id)} className={buttonVariants({ variant: 'primary' })}>
              <Icon name="truck" size={16} />
              {t('buyNow')}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t('colCs')}</th>
                  <th className="px-3 py-2 text-right font-medium">{t('colStock')}</th>
                  <th className="px-3 py-2 text-right font-medium">{t('colCost')}</th>
                  <th className="px-3 py-2 text-right font-medium">{t('colPrice')}</th>
                  <th className="px-3 py-2 text-center font-medium">{t('colSale')}</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <VariantRow key={v.id} product={product} variant={v} stock={stockOf(v.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          {testMode ? t('deleteNoteStaging') : t('deleteNote')}
        </p>
        <Button variant="danger" onClick={() => setRemoving(true)}>
          <Icon name="trash" size={16} />
          {t('delete')}
        </Button>
      </section>

      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title={t('deleteTitle', { name: product.nameNe })}
        description={testMode ? t('deleteNoteStaging') : t('deleteNote')}
        confirmLabel={remove.isPending ? tf('saving') : t('delete')}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
