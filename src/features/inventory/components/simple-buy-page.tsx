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
});
const cell = 'border-r border-b border-border p-0 align-middle';
const th = 'border-r border-b border-border px-2 py-2 font-medium';
const box =
  'h-9 w-full bg-transparent px-2 text-sm outline-none focus:bg-primary/5 disabled:opacity-40';
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

// One thing bought, as one row of the sheet: the item, its colour or size, how much, what one cost and
// (if known) what one sells for.
function LineRow({
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
  const label = (name: string) => `${name} ${index + 1}`;

  return (
    <tr>
      <td className="sticky left-0 z-[5] border-r border-b border-border bg-card px-2 text-center text-xs text-muted-foreground">
        {index + 1}
      </td>
      <td className={`${cell} sticky left-10 z-[5] bg-card shadow-[1px_0_0_var(--color-border)]`}>
        <SearchSelect
          bare
          aria-label={label(t('item'))}
          source={choices.products}
          value={line.productId}
          onChange={(value) =>
            onChange({ productId: String(value), unitId: '', optionValueIds: [] })
          }
        />
      </td>
      <td
        className={cell}
        title={known.length ? t('colourKnown', { list: known.join(', ') }) : t('colourHint')}
      >
        <SearchSelect
          bare
          multiple
          aria-label={label(t('colour'))}
          disabled={!line.productId}
          placeholder={t('colourNone')}
          source={choices.optionValues}
          value={line.optionValueIds}
          onChange={(value) => onChange({ optionValueIds: value as string[] })}
        />
      </td>
      <td className={cell}>
        <input
          aria-label={label(t('quantity'))}
          inputMode="decimal"
          value={line.quantity}
          placeholder="0"
          onChange={(e) => onChange({ quantity: e.target.value })}
          className={`${box} text-right`}
        />
      </td>
      <td className={cell}>
        <SearchSelect
          bare
          required
          aria-label={label(t('unit'))}
          disabled={!line.productId}
          source={unitSource}
          value={line.unitId}
          onChange={(value) => onChange({ unitId: String(value) })}
        />
      </td>
      <td className={cell}>
        <input
          aria-label={label(t('rate', { unit: unitSymbol || t('one') }))}
          inputMode="decimal"
          value={line.rate}
          placeholder="0"
          onChange={(e) => onChange({ rate: e.target.value })}
          className={`${box} text-right`}
        />
      </td>
      <td className={cell}>
        <input
          aria-label={label(t('sellPrice', { unit: unitSymbol || t('one') }))}
          inputMode="decimal"
          value={line.sellPrice}
          placeholder={t('later')}
          onChange={(e) => onChange({ sellPrice: e.target.value })}
          className={`${box} text-right`}
        />
      </td>
      <td className={cell}>
        <SearchSelect
          bare
          required
          aria-label={label(t('vat'))}
          value={line.vat || 'AUTO'}
          options={[
            { value: 'AUTO', label: t('vatAuto') },
            { value: '13', label: '13%' },
            { value: '0', label: t('vatNone') },
          ]}
          onChange={(value) => onChange({ vat: value === 'AUTO' ? '' : String(value) })}
        />
      </td>
      <td className={cell}>
        <input
          type="date"
          aria-label={label(t('expires'))}
          value={line.expiresOn}
          onChange={(e) => onChange({ expiresOn: e.target.value })}
          className={box}
        />
      </td>
      <td className="sticky right-[50px] z-[5] border-r border-b border-border bg-card px-3 text-right text-sm whitespace-nowrap tabular-nums shadow-[-1px_0_0_var(--color-border)]">
        {total.toFixed(2)}
      </td>
      <td className="sticky right-0 z-[5] border-b border-border bg-card px-1 text-center">
        <IconButton
          icon="trash"
          variant="danger"
          label={t('removeLine')}
          disabled={!removable}
          onClick={onRemove}
        />
      </td>
    </tr>
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

  // Anything typed or chosen counts; the item brought in from "Buy it now" alone does not.
  const start = emptyLine(itemId);
  const lineTouched = (l: Line, i: number) =>
    (i > 0 && l.productId !== '') ||
    (i === 0 && l.productId !== start.productId) ||
    l.optionValueIds.length > 0 ||
    [l.quantity, l.rate, l.sellPrice, l.vat, l.expiresOn].some((v) => v.trim() !== '');
  const guard = useUnsavedGuard(
    !save.isSuccess &&
      (supplierId !== '' ||
        billNo.trim() !== '' ||
        note.trim() !== '' ||
        lines.length > 1 ||
        lines.some(lineTouched)),
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
        <p className="text-xs text-muted-foreground">{t('sheetNote')}</p>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-[1280px] table-fixed border-separate border-spacing-0 text-sm">
            <colgroup>
              <col style={{ width: 40 }} />
              <col style={{ width: 240 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 50 }} />
            </colgroup>
            <thead className="bg-muted text-xs whitespace-nowrap text-muted-foreground">
              <tr>
                <th className={`${th} sticky left-0 z-20 bg-muted text-center`}>#</th>
                <th
                  className={`${th} sticky left-10 z-20 bg-muted text-left shadow-[1px_0_0_var(--color-border)]`}
                >
                  {t('item')} *
                </th>
                <th className={`${th} text-left`}>{t('colour')}</th>
                <th className={`${th} text-right`}>{t('quantity')} *</th>
                <th className={`${th} text-left`}>{t('unit')} *</th>
                <th className={`${th} text-right`}>{t('rateCol')} *</th>
                <th className={`${th} text-right`}>{t('sellCol')}</th>
                <th className={`${th} text-left`}>{t('vat')}</th>
                <th className={`${th} text-left`}>{t('expires')}</th>
                <th
                  className={`${th} sticky right-[50px] z-20 bg-muted text-right shadow-[-1px_0_0_var(--color-border)]`}
                >
                  {t('total')}
                </th>
                <th className="sticky right-0 z-20 border-b border-border bg-muted" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <LineRow
                  key={index}
                  line={line}
                  index={index}
                  onChange={(patch) => change(index, patch)}
                  onRemove={() => setLines((all) => all.filter((_, i) => i !== index))}
                  removable={lines.length > 1}
                />
              ))}
            </tbody>
          </table>
        </div>
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
