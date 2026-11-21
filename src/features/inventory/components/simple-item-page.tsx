'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import { SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { Icon } from '@/components/icons';
import { ConfirmDialog, useToast } from '@/components/overlays';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ItemGroups } from '@/features/marketing';
import { PhotosPanel, unitsFor } from '@/features/products';
import { useTestModeOn } from '@/hooks/use-test-mode';
import { useUnsavedGuard } from '@/lib/use-unsaved-guard';
import { isApiError, request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

type Product = Schema<'AdminProductResponse'>;
type Variant = Schema<'AdminVariantResponse'>;
type Level = Schema<'StockLevelResponse'>;

const money = (amount: string | null | undefined) => (amount ? formatMoney(amount, 'en') : '—');

// What one way of selling the item is called: its colours and sizes, else its amount (1 set, 50 g).
const nameOf = (v: Variant) =>
  v.options.length ? v.options.map((o) => o.valueEn).join(' · ') : v.label;

// A plain section: a heading, a line saying what it is for, and its content.
function Section({
  id,
  title,
  note,
  children,
}: {
  id?: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="grid scroll-mt-6 gap-3">
      <div>
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

// One way the item is sold: how much is in stock, and its selling price, changed right here.
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
          <span className="font-semibold">{t('stockCount', { n: stock, unit })}</span>
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
function AddSize({ product, onDone }: { product: Product; onDone: () => void }) {
  const t = useTranslations('inventory.itemPage');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [unitId, setUnitId] = useState('');
  const [price, setPrice] = useState('');
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
    <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[8rem_10rem_10rem_auto] sm:items-end">
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

// A step of "what next": done (tick) or still to do (with the one button that does it).
function NextStep({ done, text, action }: { done: boolean; text: string; action?: ReactNode }) {
  return (
    <li
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm',
        done ? 'border-success/30 bg-success/5' : 'border-warning/40 bg-warning/5',
      )}
    >
      <span className="flex items-center gap-2">
        <Icon
          name={done ? 'check' : 'clock'}
          size={16}
          className={done ? 'text-success' : 'text-warning'}
        />
        {text}
      </span>
      {done ? null : action}
    </li>
  );
}

// An item on one page, top to bottom, no tabs: what is still to do, its photo and website text,
// its stock and selling prices, and the groups it is in. Rarely needed settings (tax, HS code,
// offers, quality, "goes with") stay on the expert page linked at the bottom.
export function SimpleItemPage({ id }: { id: string }) {
  const t = useTranslations('inventory.itemPage');
  const tf = useTranslations('forms');
  const tc = useTranslations('common');
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const testMode = useTestModeOn();
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState({
    nameNe: '',
    nameEn: '',
    description: '',
    isActive: true,
  });
  const [addingSize, setAddingSize] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [discarding, setDiscarding] = useState(false);

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

  const saveDetails = useMutation({
    mutationFn: (product: Product) =>
      request('PATCH', `/admin/products/${id}`, {
        body: {
          nameNe: details.nameNe.trim(),
          nameEn: details.nameEn.trim(),
          description: details.description.trim() || null,
          sellBy: product.sellBy,
          isActive: details.isActive,
          allowDuplicateName: true,
        },
      }),
    onSuccess: async () => {
      toast.success(t('detailsSaved'));
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

  // Details changed but not saved: leaving the page, or Cancel, asks first.
  const detailsChanged =
    editing &&
    item.data !== undefined &&
    (details.nameNe.trim() !== item.data.nameNe ||
      details.nameEn.trim() !== item.data.nameEn ||
      details.description.trim() !== (item.data.description ?? '') ||
      details.isActive !== item.data.isActive);
  const guard = useUnsavedGuard(detailsChanged && !saveDetails.isPending);

  if (item.isPending) return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  if (item.isError || !item.data)
    return <p className="text-sm text-destructive">{t('notFound')}</p>;
  const product = item.data;
  const variants = product.variants;
  const hasPhoto = product.images.length > 0;
  const onSale = variants.some((v) => v.isActive);
  const inStock = variants.some((v) => stockOf(v.id) > 0);
  const scrollTo = (anchor: string) =>
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="grid max-w-5xl gap-8">
      {guard}
      <div>
        <Link
          href={routes.products()}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {t('back')}
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {hasPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images[0]!.url}
                alt=""
                className="size-16 rounded-lg border border-border object-cover"
              />
            ) : null}
            <div>
              <h1 className="font-heading text-2xl font-semibold">{product.nameNe}</h1>
              <p className="text-sm text-muted-foreground">
                {product.nameEn} · {t(`sellBy.${product.sellBy}`)} ·{' '}
                {product.isActive ? t('onWebsite') : t('hiddenFromWebsite')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={routes.buy(product.id)} className={buttonVariants({ variant: 'primary' })}>
              <Icon name="truck" size={16} />
              {t('buyMore')}
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                setDetails({
                  nameNe: product.nameNe,
                  nameEn: product.nameEn,
                  description: product.description ?? '',
                  isActive: product.isActive,
                });
                setEditing(true);
              }}
            >
              <Icon name="edit" size={16} />
              {t('editDetails')}
            </Button>
          </div>
        </div>
      </div>

      <Section title={t('nextTitle')} note={t('nextNote')}>
        <ul className="grid gap-2">
          <NextStep
            done={onSale}
            text={onSale ? t('nextPriceDone') : t('nextPrice')}
            action={
              <Button size="sm" variant="secondary" onClick={() => scrollTo('prices')}>
                {t('nextPriceGo')}
              </Button>
            }
          />
          <NextStep
            done={inStock}
            text={inStock ? t('nextStockDone') : t('nextStock')}
            action={
              <Link
                href={routes.buy(product.id)}
                className={buttonVariants({ variant: 'primary', size: 'sm' })}
              >
                {t('buyMore')}
              </Link>
            }
          />
          <NextStep
            done={hasPhoto}
            text={hasPhoto ? t('nextPhotoDone') : t('nextPhoto')}
            action={
              <Button size="sm" variant="secondary" onClick={() => scrollTo('photos')}>
                {t('nextPhotoGo')}
              </Button>
            }
          />
        </ul>
      </Section>

      {editing ? (
        <section className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
          <Field label={`${t('nameNe')} *`} htmlFor="item-name-ne">
            <Input
              id="item-name-ne"
              value={details.nameNe}
              maxLength={160}
              onChange={(e) => setDetails({ ...details, nameNe: e.target.value })}
            />
          </Field>
          <Field label={`${t('nameEn')} *`} htmlFor="item-name-en">
            <Input
              id="item-name-en"
              value={details.nameEn}
              maxLength={160}
              onChange={(e) => setDetails({ ...details, nameEn: e.target.value })}
            />
          </Field>
          <Field
            label={t('description')}
            htmlFor="item-description"
            hint={t('descriptionHint')}
            className="sm:col-span-2"
          >
            <textarea
              id="item-description"
              rows={3}
              maxLength={4000}
              value={details.description}
              onChange={(e) => setDetails({ ...details, description: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="size-4"
              checked={details.isActive}
              onChange={(e) => setDetails({ ...details, isActive: e.target.checked })}
            />
            {t('showOnWebsite')}
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button
              variant="secondary"
              onClick={() => (detailsChanged ? setDiscarding(true) : setEditing(false))}
            >
              {tf('cancel')}
            </Button>
            <Button
              disabled={!details.nameNe.trim() || !details.nameEn.trim() || saveDetails.isPending}
              onClick={() => saveDetails.mutate(product)}
            >
              {saveDetails.isPending ? tf('saving') : tf('save')}
            </Button>
          </div>
        </section>
      ) : null}

      <Section id="prices" title={t('stockTitle')} note={t('stockNote')}>
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
                  <th className="px-3 py-2 text-left font-medium" title={t('colCsHelp')}>
                    {t('colCs')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">{t('colStock')}</th>
                  <th className="px-3 py-2 text-right font-medium" title={t('colCostHelp')}>
                    {t('colCost')}
                  </th>
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
        {addingSize ? (
          <AddSize product={product} onDone={() => setAddingSize(false)} />
        ) : (
          <div>
            <Button variant="secondary" size="sm" onClick={() => setAddingSize(true)}>
              <Icon name="plus" size={14} />
              {t('addSize')}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">{t('addSizeNote')}</p>
          </div>
        )}
      </Section>

      <Section id="photos" title={t('photosTitle')} note={t('photosNote')}>
        <PhotosPanel product={product} />
      </Section>

      <Section title={t('groupsTitle')} note={t('groupsNote')}>
        <ItemGroups kind="product" id={product.id} />
      </Section>

      <section className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Link
          href={`${routes.item(product.id)}?step=basics`}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          {t('expert')}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-muted-foreground">
            {testMode ? t('deleteNoteStaging') : t('deleteNote')}
          </p>
          <Button variant="danger" onClick={() => setRemoving(true)}>
            <Icon name="trash" size={16} />
            {t('delete')}
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={discarding}
        onOpenChange={setDiscarding}
        title={tc('discardTitle')}
        description={tc('discardBody')}
        confirmLabel={tc('discard')}
        keepLabel={tc('keepEditing')}
        onConfirm={() => {
          setDiscarding(false);
          setEditing(false);
        }}
      />
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
