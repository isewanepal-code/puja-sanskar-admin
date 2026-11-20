'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { Icon } from '@/components/icons';
import { useToast } from '@/components/overlays';
import { BsDatePicker } from '@/components/ui/bs-date-picker';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { unitsFor } from '@/features/products';
import { isApiError, request, type Schema } from '@/lib/api';
import { choices } from '@/lib/choices';
import { formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';
import { useUnsavedGuard } from '@/lib/use-unsaved-guard';
import { cn } from '@/lib/utils';

type Product = Schema<'AdminProductResponse'>;
type Bill = Schema<'PurchaseBillResponse'>;

type Line = {
  productId: string;
  // Colour, size or any other difference of what was bought (red cloth, size L shirt).
  optionValueIds: string[];
  quantity: string;
  unitId: string;
  rate: string;
  // What one unit sells for; empty leaves the price for later.
  sellPrice: string;
  vat: string;
  expiresOn: string;
  more: boolean;
};

const emptyLine = (productId = ''): Line => ({
  productId,
  optionValueIds: [],
  quantity: '',
  unitId: '',
  rate: '',
  sellPrice: '',
  vat: '',
  expiresOn: '',
  more: false,
});
const today = () => new Date().toISOString().slice(0, 10);
const num = (text: string) => Number(text.replace(/,/g, ''));
// The unit most shops count each way of selling in, picked first: kg, metre, litre.
const USUAL = ['pc', 'pcs', 'kg', 'm', 'l', 'ltr'];

// A bill number for staff who have no paper bill: the day and time it was typed in.
const autoBillNo = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `NB-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

// One thing bought: the item, its colour or size, how much, what it cost and (if known) what it sells for.
function LineCard({
  line,
  index,
  onChange,
  onRemove,
  removable,
}: {
  line: Line;
  index: number;
  onChange: (patch: Partial<Line>) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const t = useTranslations('inventory.buy');
  const item = useQuery({
    queryKey: ['products', 'buy', line.productId],
    queryFn: () => request<Product>('GET', `/admin/products/${line.productId}`),
    enabled: Boolean(line.productId),
  });
  const sellBy = item.data?.sellBy ?? 'PIECE';
  const unitSource = unitsFor(sellBy);
  const units = useQuery({
    queryKey: ['units-for', sellBy],
    queryFn: unitSource.load,
    enabled: Boolean(line.productId),
    staleTime: 5 * 60 * 1000,
  });
  // The usual unit is chosen for staff as soon as the item is known.
  useEffect(() => {
    const list = units.data ?? [];
    if (!line.productId || line.unitId || list.length === 0) return;
    const usual = list.find((u) => USUAL.includes((u.detail ?? '').toLowerCase())) ?? list[0]!;
    onChange({ unitId: usual.value });
  }, [units.data, line.productId, line.unitId, onChange]);

  const unitSymbol = units.data?.find((u) => u.value === line.unitId)?.detail ?? '';
  // Colours and sizes this item already comes in, as a reminder.
  const known = [
    ...new Set(
      (item.data?.variants ?? []).flatMap((v) => v.options.map((o) => o.valueEn)).filter(Boolean),
    ),
  ];
  const total = (num(line.quantity) || 0) * (num(line.rate) || 0);
  const id = (name: string) => `buy-${index}-${name}`;

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {index + 1}
        </span>
        <IconButton
          icon="trash"
          variant="danger"
          label={t('removeLine')}
          disabled={!removable}
          onClick={onRemove}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={`${t('item')} *`} htmlFor={id('item')} hint={t('itemHint')}>
          <SearchSelect
            id={id('item')}
            source={choices.products}
            value={line.productId}
            onChange={(value) =>
              onChange({ productId: String(value), unitId: '', optionValueIds: [] })
            }
          />
        </Field>
        <Field
          label={t('colour')}
          htmlFor={id('colour')}
          hint={known.length ? t('colourKnown', { list: known.join(', ') }) : t('colourHint')}
        >
          <SearchSelect
            id={id('colour')}
            multiple
            disabled={!line.productId}
            source={choices.optionValues}
            value={line.optionValueIds}
            onChange={(value) => onChange({ optionValueIds: value as string[] })}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label={`${t('quantity')} *`} htmlFor={id('qty')}>
          <Input
            id={id('qty')}
            inputMode="decimal"
            value={line.quantity}
            placeholder="50"
            onChange={(e) => onChange({ quantity: e.target.value })}
          />
        </Field>
        <Field label={`${t('unit')} *`} htmlFor={id('unit')} hint={t(`unitHint.${sellBy}`)}>
          <SearchSelect
            id={id('unit')}
            required
            disabled={!line.productId}
            source={unitSource}
            value={line.unitId}
            onChange={(value) => onChange({ unitId: String(value) })}
          />
        </Field>
        <Field
          label={`${t('rate', { unit: unitSymbol || t('one') })} *`}
          htmlFor={id('rate')}
          hint={t('rateHint')}
        >
          <Input
            id={id('rate')}
            inputMode="decimal"
            value={line.rate}
            placeholder="0"
            onChange={(e) => onChange({ rate: e.target.value })}
          />
        </Field>
        <Field
          label={t('sellPrice', { unit: unitSymbol || t('one') })}
          htmlFor={id('sell')}
          hint={t('sellPriceHint')}
        >
          <Input
            id={id('sell')}
            inputMode="decimal"
            value={line.sellPrice}
            placeholder={t('later')}
            onChange={(e) => onChange({ sellPrice: e.target.value })}
          />
        </Field>
        <div className="grid content-start gap-1.5">
          <span className="text-sm font-medium">{t('total')}</span>
          <span className="flex h-9 items-center rounded-md bg-muted px-3 text-sm font-semibold tabular-nums">
            {formatMoney(total.toFixed(2), 'en')}
          </span>
        </div>
      </div>

      <div>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          aria-expanded={line.more}
          onClick={() => onChange({ more: !line.more })}
        >
          <Icon
            name="down"
            size={14}
            className={cn('transition-transform', line.more && 'rotate-180')}
          />
          {t('lineMore')}
        </button>
        {line.more ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t('vat')} htmlFor={id('vat')}>
              <SearchSelect
                id={id('vat')}
                required
                value={line.vat || 'AUTO'}
                options={[
                  { value: 'AUTO', label: t('vatAuto') },
                  { value: '13', label: '13%' },
                  { value: '0', label: t('vatNone') },
                ]}
                onChange={(value) => onChange({ vat: value === 'AUTO' ? '' : String(value) })}
              />
            </Field>
            <Field label={t('expires')} htmlFor={id('exp')} hint={t('expiresHint')}>
              <Input
                id={id('exp')}
                type="date"
                value={line.expiresOn}
                onChange={(e) => onChange({ expiresOn: e.target.value })}
              />
            </Field>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Step 2 of the inventory: what came from the market. Each line is an item in a colour or size, how
// much of it, and what it cost. It is kept as "one unit" of that item and colour (1 m of red cloth,
// 1 kg of rice, 1 diya), so whatever is cut or weighed out of it later is the same red cloth: no
// packs to think about. Buying the same item and colour again adds to the same stock.
export function SimpleBuyPage({ itemId }: { itemId?: string }) {
  const t = useTranslations('inventory.buy');
  const tf = useTranslations('forms');
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [billNo, setBillNo] = useState('');
  const [day, setDay] = useState(today());
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine(itemId)]);
  // The bill once made, so a retry after a failed step posts it instead of making a second one.
  const made = useRef<Bill | null>(null);
  const change = (index: number, patch: Partial<Line>) => {
    // A change after a failed save makes a fresh bill; the half-made one stays as a draft.
    made.current = null;
    setLines((all) => all.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const problem = (l: Line, i: number): string | null => {
    const n = i + 1;
    if (!l.productId) return t('needItem', { n });
    if (!(num(l.quantity) > 0) || !l.unitId) return t('needQuantity', { n });
    if (!(num(l.rate) > 0)) return t('needRate', { n });
    if (l.sellPrice.trim() && !(num(l.sellPrice) > 0)) return t('needSellPrice', { n });
    return null;
  };
  const firstProblem = lines.map(problem).find(Boolean) ?? null;
  const ready = Boolean(supplierId) && !firstProblem;
  const grand = lines.reduce((sum, l) => sum + (num(l.quantity) || 0) * (num(l.rate) || 0), 0);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        supplierId,
        supplierBillNumber: billNo.trim() || autoBillNo(),
        billDay: day,
        note: note.trim() || null,
        lines: lines.map((l) => ({
          newPack: {
            productId: l.productId,
            packQuantity: 1,
            packUnitId: l.unitId,
            ...(l.optionValueIds.length ? { optionValueIds: l.optionValueIds } : {}),
          },
          quantity: num(l.quantity),
          unitCost: String(num(l.rate)),
          ...(l.vat !== '' && { vatRate: l.vat }),
          ...(l.expiresOn && { expiresOn: l.expiresOn }),
        })),
      };
      const bill = made.current ?? (await request<Bill>('POST', '/admin/purchase-bills', { body }));
      made.current = bill;
      // Into stock now: what was bought is on the shelf.
      if (bill.status === 'DRAFT') {
        await request('POST', `/admin/purchase-bills/${bill.id}/post`, {
          headers: { 'Idempotency-Key': `post-${bill.id}` },
        });
        made.current = { ...bill, status: 'POSTED' };
      }
      // A selling price given here puts that colour/size on sale straight away.
      const priced = lines
        .map((l, i) => ({ line: l, variantId: bill.lines[i]?.variantId }))
        .filter((row) => row.variantId && num(row.line.sellPrice) > 0);
      for (const row of priced) {
        await request('PATCH', `/admin/products/${row.line.productId}/variants/${row.variantId}`, {
          body: {
            price: String(num(row.line.sellPrice)),
            pricesIncludeTax: true,
            isActive: true,
          },
        });
      }
      return { unpriced: lines.length - priced.length };
    },
    onSuccess: async ({ unpriced }) => {
      toast.success(unpriced > 0 ? t('savedNeedPrice', { n: unpriced }) : t('saved'));
      await Promise.all(
        ['purchaseBills', 'products', 'stock', 'suppliers'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
      router.push(unpriced > 0 ? routes.itemPrices() : routes.stock());
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  const guard = useUnsavedGuard(
    !save.isSuccess && (supplierId !== '' || lines.some((l) => l.quantity !== '' || l.rate !== '')),
  );

  return (
    <div className="grid max-w-5xl gap-6">
      {guard}

      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-3">
        <Field label={`${t('supplier')} *`} htmlFor="buy-supplier" hint={t('supplierHint')}>
          <SearchSelect
            id="buy-supplier"
            source={choices.suppliers}
            value={supplierId}
            onChange={(value) => setSupplierId(String(value))}
          />
        </Field>
        <Field label={t('billNo')} htmlFor="buy-bill" hint={t('billNoHint')}>
          <Input
            id="buy-bill"
            value={billNo}
            maxLength={60}
            placeholder={t('billNoPlaceholder')}
            onChange={(e) => setBillNo(e.target.value)}
          />
        </Field>
        <Field label={t('day')} htmlFor="buy-day">
          <BsDatePicker id="buy-day" value={day} onChange={setDay} />
        </Field>
      </section>

      <section className="grid gap-3">
        <h2 className="font-heading text-base font-semibold">{t('what')}</h2>
        {lines.map((line, index) => (
          <LineCard
            key={index}
            line={line}
            index={index}
            onChange={(patch) => change(index, patch)}
            onRemove={() => setLines((all) => all.filter((_, i) => i !== index))}
            removable={lines.length > 1}
          />
        ))}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" onClick={() => setLines((all) => [...all, emptyLine()])}>
            <Icon name="plus" size={16} />
            {t('addLine')}
          </Button>
          <span className="text-sm">
            {t('grandTotal')}{' '}
            <span className="font-semibold tabular-nums">
              {formatMoney(grand.toFixed(2), 'en')}
            </span>
          </span>
        </div>
      </section>

      <Field label={t('note')} htmlFor="buy-note">
        <Input
          id="buy-note"
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className={cn('text-sm', ready ? 'text-muted-foreground' : 'text-destructive')}>
          {!supplierId ? t('needSupplier') : (firstProblem ?? t('ready'))}
        </p>
        <Button disabled={!ready || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? tf('saving') : t('save')}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('packetsNote')}{' '}
        <Link href={routes.newPurchase()} className="text-primary underline">
          {t('packetsLink')}
        </Link>
      </p>
    </div>
  );
}
