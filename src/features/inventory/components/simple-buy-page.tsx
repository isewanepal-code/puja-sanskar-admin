'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { CreateModal, WorkbookUploadButton } from '@/components/resource';
import { Icon } from '@/components/icons';
import { useToast } from '@/components/overlays';
import { BsDatePicker } from '@/components/ui/bs-date-picker';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { brandsResource } from '@/features/catalogue';
import { suppliersResource } from '@/features/purchases';
import { optionValueResource, unitsFor, type OptionType } from '@/features/products';
import { isApiError, request, type Schema } from '@/lib/api';
import { choices } from '@/lib/choices';
import { formatMoney } from '@/lib/format';
import { measureOf } from '@/lib/unit-measure';
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
  // The brand or company of the item: filled from the item, and saved back to it when changed.
  brand: string;
  // The brand the item had when it loaded, to see whether it was changed here.
  itemBrand: string;
  // A word about this line, kept on the bill.
  remarks: string;
  // 'AUTO' takes the item's own VAT; the default is no VAT.
  vat: string;
  expiresOn: string;
  // The item's own VAT %, learnt when it loads; used for the totals only.
  itemVat: string;
  // How the item is sold (piece, weight…), learnt when it loads: a piece item cannot be bought by halves.
  sellBy: string;
  // The unit bought in is a sack, box or roll of something weighed or measured: how much one holds
  // (25 of kg), asked here once so the stock can show the total and open it.
  container: boolean;
  holds: string;
  holdsUnitId: string;
  // The names the pack is called by: the unit bought in (बोरा) and the unit it holds (kg).
  unitLabel: string;
  holdsSymbol: string;
};

const emptyLine = (productId = ''): Line => ({
  productId,
  optionValueIds: [],
  quantity: '',
  unitId: '',
  rate: '',
  brand: '',
  itemBrand: '',
  remarks: '',
  vat: '0',
  expiresOn: '',
  itemVat: '0',
  sellBy: '',
  container: false,
  holds: '',
  holdsUnitId: '',
  unitLabel: '',
  holdsSymbol: '',
});
const cell = 'border-r border-b border-border p-0 align-middle';
const th = 'border-r border-b border-border px-2 py-2 font-medium';
const box =
  'h-9 w-full bg-transparent px-2 text-sm outline-none focus:bg-primary/5 disabled:opacity-40';
const today = () => new Date().toISOString().slice(0, 10);
// The same limits the server holds to: a typo like an extra zero is caught here, beside the box.
const MAX_QUANTITY = 1_000_000;
const MAX_MONEY = 100_000_000;
const num = (text: string) => Number(text.replace(/,/g, ''));
// The VAT % a line pays: chosen on the line, else the item's own.
const vatOf = (l: { vat: string; itemVat: string }) =>
  num(l.vat === 'AUTO' ? l.itemVat : l.vat) || 0;
// The unit most shops count each way of selling in, picked first: kg, metre, litre.
const USUAL = ['pc', 'pcs', 'kg', 'm', 'l', 'ltr'];

// One thing bought, as one row of the sheet: the item, its colour or size, how much, what one cost and
// (if known) what one sells for.
function LineRow({
  line,
  index,
  onChange,
  onRemove,
  onNewBrand,
  onNewColour,
  removable,
  showErrors,
}: {
  line: Line;
  index: number;
  onChange: (patch: Partial<Line>) => void;
  onRemove: () => void;
  onNewBrand: () => void;
  // Only when a colour kind exists to add a value to.
  onNewColour?: () => void;
  removable: boolean;
  // After Save was pressed with something missing: the empty cells turn red.
  showErrors: boolean;
}) {
  const t = useTranslations('inventory.buy');
  const item = useQuery({
    queryKey: ['products', 'buy', line.productId],
    queryFn: () => request<Product>('GET', `/admin/products/${line.productId}`),
    enabled: Boolean(line.productId),
  });
  // Units are looked up only once the item is known, so a kg item never gets a piece unit first.
  const sellBy = item.data?.sellBy;
  const units = useQuery({
    queryKey: ['units-for', sellBy],
    queryFn: () => unitsFor(sellBy!).load(),
    enabled: Boolean(line.productId && sellBy),
    staleTime: 5 * 60 * 1000,
  });
  const unitList = useMemo(
    () => (line.productId && sellBy ? (units.data ?? []) : []),
    [line.productId, sellBy, units.data],
  );
  const unitKnown = unitList.some((u) => u.value === line.unitId);
  // The usual unit is chosen for staff as soon as the item is known, and a unit that does not fit
  // the item (left from another item) is replaced.
  useEffect(() => {
    if (unitList.length === 0 || unitKnown) return;
    const usual =
      unitList.find((u) => USUAL.includes((u.detail ?? '').toLowerCase())) ?? unitList[0]!;
    onChange({ unitId: usual.value });
  }, [unitList, unitKnown, onChange]);
  // The item's VAT, for the totals.
  const itemVat = item.data?.effectiveTax.ratePercent ?? '0';
  useEffect(() => {
    if (line.productId && item.data && line.itemVat !== itemVat) onChange({ itemVat });
  }, [line.productId, item.data, line.itemVat, itemVat, onChange]);

  // How the item is sold, for the checks on the amount.
  const sellByNow = item.data?.sellBy ?? '';
  useEffect(() => {
    if (line.productId && item.data && line.sellBy !== sellByNow) onChange({ sellBy: sellByNow });
  }, [line.productId, item.data, line.sellBy, sellByNow, onChange]);
  // The item's brand fills the brand cell once, until someone picks another.
  const itemBrand = item.data?.brand ?? '';
  useEffect(() => {
    if (line.productId && item.data && line.itemBrand !== itemBrand) {
      onChange({ itemBrand, brand: itemBrand });
    }
  }, [line.productId, item.data, line.itemBrand, itemBrand, onChange]);

  const unitSymbol = unitList.find((u) => u.value === line.unitId)?.detail ?? '';
  const boughtIn = unitList.find((u) => u.value === line.unitId);
  // Kilos, grams, litres, metres...: what a sack may be said to hold.
  const measures = unitList.filter((u) => measureOf(1, u.detail ?? '') !== null);
  const container =
    ['WEIGHT', 'VOLUME', 'LENGTH'].includes(sellBy ?? '') &&
    Boolean(boughtIn) &&
    measureOf(1, unitSymbol) === null &&
    measures.length > 0;
  const bigMeasure =
    measures.find((u) => ['kg', 'l', 'm'].includes((u.detail ?? '').toLowerCase())) ?? measures[0];
  const holdsUnitKnown = measures.some((u) => u.value === line.holdsUnitId);
  const holdsSymbol = measures.find((u) => u.value === line.holdsUnitId)?.detail ?? '';
  const unitLabel = boughtIn?.label ?? '';
  useEffect(() => {
    if (
      line.container !== container ||
      line.unitLabel !== unitLabel ||
      line.holdsSymbol !== holdsSymbol
    ) {
      onChange({ container, unitLabel, holdsSymbol });
    } else if (container && !holdsUnitKnown && bigMeasure) {
      onChange({ holdsUnitId: bigMeasure.value });
    }
  }, [
    container,
    unitLabel,
    holdsSymbol,
    line.container,
    line.unitLabel,
    line.holdsSymbol,
    holdsUnitKnown,
    bigMeasure,
    onChange,
  ]);
  // Colours and sizes this item already comes in, as a reminder.
  const known = [
    ...new Set(
      (item.data?.variants ?? []).flatMap((v) => v.options.map((o) => o.valueEn)).filter(Boolean),
    ),
  ];
  const total = (num(line.quantity) || 0) * (num(line.rate) || 0);
  const vatPercent = vatOf(line);
  const bad = (missing: boolean) => (showErrors && missing ? 'bg-destructive/10' : '');
  const label = (name: string) => `${name} ${index + 1}`;

  return (
    <Fragment>
      <tr>
        <td className="border-r border-b border-border px-1 text-center text-xs text-muted-foreground">
          {index + 1}
        </td>
        <td className={cn(cell, bad(!line.productId))}>
          <SearchSelect
            bare
            invalid={showErrors && !line.productId}
            aria-label={label(t('item'))}
            source={choices.buyItems}
            placeholder={t('itemSearch')}
            wrapValue
            value={line.productId}
            onChange={(value) =>
              onChange({
                productId: String(value),
                unitId: '',
                optionValueIds: [],
                brand: '',
                itemBrand: '',
                holds: '',
                holdsUnitId: '',
              })
            }
          />
        </td>
        <td className={cell}>
          <div className="flex items-center">
            <div className="min-w-0 flex-1">
              <SearchSelect
                bare
                aria-label={label(t('brand'))}
                disabled={!line.productId}
                placeholder="—"
                source={choices.brands}
                value={line.brand}
                onChange={(value) => onChange({ brand: String(value) })}
              />
            </div>
            <IconButton
              icon="plus"
              label={t('newBrand')}
              disabled={!line.productId}
              onClick={onNewBrand}
            />
          </div>
        </td>
        <td
          className={cell}
          title={known.length ? t('colourKnown', { list: known.join(', ') }) : t('colourHint')}
        >
          <div className="flex items-center">
            <div className="min-w-0 flex-1">
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
            </div>
            {onNewColour ? (
              <IconButton
                icon="plus"
                label={t('newColour')}
                disabled={!line.productId}
                onClick={onNewColour}
              />
            ) : null}
          </div>
        </td>
        <td className={cn(cell, bad(!(num(line.quantity) > 0)))}>
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
            disabled={unitList.length === 0}
            placeholder={line.productId ? '…' : '—'}
            options={unitList}
            value={unitKnown ? line.unitId : ''}
            onChange={(value) => onChange({ unitId: String(value) })}
          />
        </td>
        <td className={cell}>
          <input
            aria-label={label(t('remarks'))}
            value={line.remarks}
            maxLength={200}
            onChange={(e) => onChange({ remarks: e.target.value })}
            className={box}
          />
        </td>
        <td className={cn(cell, bad(!(num(line.rate) > 0)))}>
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
          <SearchSelect
            bare
            required
            aria-label={label(t('vat'))}
            value={line.vat}
            options={[
              { value: '0', label: t('vatNone') },
              { value: '13', label: '13%' },
              { value: 'AUTO', label: t('vatAuto') },
            ]}
            onChange={(value) => onChange({ vat: String(value) })}
          />
        </td>
        <td className={cell}>
          <BsDatePicker
            bare
            aria-label={label(t('expires'))}
            value={line.expiresOn}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(expiresOn) => onChange({ expiresOn })}
          />
        </td>
        <td className="border-r border-b border-border px-2 text-right text-sm whitespace-nowrap tabular-nums">
          <div className="font-medium">{total.toFixed(2)}</div>
          {vatPercent > 0 && total > 0 ? (
            <div className="text-[0.7rem] text-muted-foreground">
              {t('withVat', {
                percent: vatPercent,
                amount: (total * (1 + vatPercent / 100)).toFixed(2),
              })}
            </div>
          ) : null}
        </td>
        <td className="border-b border-border px-1 text-center">
          <IconButton
            icon="trash"
            variant="danger"
            label={t('removeLine')}
            disabled={!removable}
            onClick={onRemove}
          />
        </td>
      </tr>
      {container ? (
        <tr className="bg-primary/5">
          <td className="border-b border-border" />
          <td colSpan={11} className="border-b border-border px-3 py-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-sm font-medium">
                {t('holdsTitle', { unit: boughtIn?.label ?? '' })}
              </span>
              <input
                aria-label={label(t('holdsTitle', { unit: boughtIn?.label ?? '' }))}
                inputMode="decimal"
                value={line.holds}
                placeholder="25"
                onChange={(e) => onChange({ holds: e.target.value })}
                className={cn(
                  'h-8 w-24 rounded-md border border-border bg-card px-2 text-right text-sm outline-none focus:border-primary',
                  showErrors && !(num(line.holds) > 0) && 'border-destructive',
                )}
              />
              <div className="w-40">
                <SearchSelect
                  aria-label={label(t('unit'))}
                  options={measures}
                  required
                  value={holdsUnitKnown ? line.holdsUnitId : ''}
                  onChange={(value) => onChange({ holdsUnitId: String(value) })}
                />
              </div>
              {num(line.holds) > 0 && num(line.quantity) > 0 ? (
                <span className="text-sm text-muted-foreground">
                  {t('holdsTotal', {
                    count: num(line.quantity),
                    amount: `${num(line.holds)} ${holdsSymbol}`,
                    total: `${Math.round(num(line.quantity) * num(line.holds) * 1000) / 1000} ${holdsSymbol}`,
                  })}
                </span>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

// Step 2 of the inventory: what came from the market. Each line is an item in a colour or size, how
// much of it, and what it cost. It is kept as "one unit" of that item and colour (1 m of red cloth,
// 1 kg of rice, 1 diya), so whatever is cut or weighed out of it later is the same red cloth: no
// packs to think about. Buying the same item and colour again adds to the same stock.
export function SimpleBuyPage({ itemId, back }: { itemId?: string; back?: string }) {
  const t = useTranslations('inventory.buy');
  const tf = useTranslations('forms');
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [billNo, setBillNo] = useState('');
  const [day, setDay] = useState(today());
  const [note, setNote] = useState('');
  // Taken off the whole bill by the supplier; optional.
  const [discount, setDiscount] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine(itemId)]);
  // Save pressed with something missing: the missing places turn red and are named.
  const [showErrors, setShowErrors] = useState(false);
  // The real supplier and brand forms, opened right here for something new.
  const supplierForm = useMemo(() => suppliersResource(), []);
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [brandFor, setBrandFor] = useState<number | null>(null);
  const [colourFor, setColourFor] = useState<number | null>(null);
  // The colour kind new colours are added to, found among the option kinds.
  const optionTypes = useQuery({
    queryKey: ['option-types', 'buy'],
    queryFn: () =>
      request<OptionType[]>('GET', '/admin/option-types', { query: { isActive: true } }),
    staleTime: 5 * 60 * 1000,
  });
  const colourType = optionTypes.data?.find((type) => type.kind === 'COLOR');
  // A shop that has never set up colours gets the colour kind made here, then the value form.
  const openColour = async (index: number) => {
    if (!colourType) {
      try {
        await request('POST', '/admin/option-types', {
          body: { code: 'COLOUR', nameEn: 'Colour', nameNe: 'रङ', kind: 'COLOR', isActive: true },
        });
        await optionTypes.refetch();
      } catch (error) {
        toast.error(isApiError(error) ? error.message : tf('failed'));
        return;
      }
    }
    setColourFor(index);
  };
  const colourForm = useMemo(
    () => (colourType ? optionValueResource(colourType) : null),
    [colourType],
  );
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
    if (!/^\d+(\.\d{1,3})?$/.test(l.quantity.trim().replace(/,/g, '')))
      return t('quantityDecimals', { n });
    if (num(l.quantity) > MAX_QUANTITY) return t('quantityTooBig', { n });
    if (l.sellBy === 'PIECE' && !Number.isInteger(num(l.quantity)))
      return t('quantityWhole', { n });
    if (l.container && !(num(l.holds) > 0)) return t('needHolds', { n });
    if (!(num(l.rate) > 0)) return t('needRate', { n });
    if (!/^\d+(\.\d{1,2})?$/.test(l.rate.trim().replace(/,/g, ''))) return t('rateDecimals', { n });
    if (num(l.rate) > MAX_MONEY) return t('rateTooBig', { n });
    if (l.container && !/^\d+(\.\d{1,3})?$/.test(l.holds.trim()))
      return t('quantityDecimals', { n });
    if (l.expiresOn && l.expiresOn < day) return t('expiryBeforeBill', { n });
    return null;
  };
  const firstProblem = lines.map(problem).find(Boolean) ?? null;

  const grand = lines.reduce((sum, l) => sum + (num(l.quantity) || 0) * (num(l.rate) || 0), 0);
  const vatTotal = lines.reduce(
    (sum, l) => sum + (num(l.quantity) || 0) * (num(l.rate) || 0) * (vatOf(l) / 100),
    0,
  );
  const billTotal = grand + vatTotal;
  const discountAmount = num(discount) || 0;
  // A discount is a number of rupees, no more than the bill itself.
  const discountProblem =
    discount.trim() === ''
      ? null
      : !/^\d+(\.\d{1,2})?$/.test(discount.trim().replace(/,/g, ''))
        ? t('discountFormat')
        : discountAmount > billTotal
          ? t('discountTooBig', { total: formatMoney(billTotal.toFixed(2), 'en') })
          : null;
  const discountBad = discountProblem !== null;
  const billProblem =
    billTotal > MAX_MONEY ? t('billTooBig') : day > today() ? t('billDateFuture') : null;
  // The supplier's own bill number is always needed: it ties this purchase to their paper bill.
  const billNoProblem = billNo.trim() === '' ? t('needBillNo') : null;
  const ready =
    Boolean(supplierId) && !billNoProblem && !firstProblem && !discountBad && !billProblem;
  const tryToSave = () => {
    if (ready) {
      save.mutate();
      return;
    }
    setShowErrors(true);
    toast.error(
      !supplierId
        ? t('needSupplier')
        : (billNoProblem ?? firstProblem ?? discountProblem ?? billProblem ?? t('needSupplier')),
    );
    if (!supplierId) document.getElementById('buy-supplier')?.focus();
    else if (billNoProblem) document.getElementById('buy-bill')?.focus();
  };

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        supplierId,
        supplierBillNumber: billNo.trim(),
        billDay: day,
        note: note.trim() || null,
        ...(discountAmount > 0 && { discount: discountAmount.toFixed(2) }),
        lines: lines.map((l) => ({
          newPack: l.container
            ? {
                // A sack of 25 kg: the pack is the sack, named by what it holds.
                productId: l.productId,
                packQuantity: num(l.holds),
                packUnitId: l.holdsUnitId,
                label: `${num(l.holds)} ${l.holdsSymbol} ${l.unitLabel}`.slice(0, 80),
                ...(l.optionValueIds.length ? { optionValueIds: l.optionValueIds } : {}),
              }
            : {
                productId: l.productId,
                packQuantity: 1,
                packUnitId: l.unitId,
                ...(l.optionValueIds.length ? { optionValueIds: l.optionValueIds } : {}),
              },
          quantity: num(l.quantity),
          unitCost: String(num(l.rate)),
          ...(l.vat !== 'AUTO' && { vatRate: l.vat }),
          ...(l.expiresOn && { expiresOn: l.expiresOn }),
          ...(l.remarks.trim() && { remarks: l.remarks.trim() }),
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
      // A brand changed here is kept on the item, so the next purchase starts from it.
      const rebranded = new Map<string, string>();
      for (const l of lines) {
        if (l.productId && l.brand !== l.itemBrand) rebranded.set(l.productId, l.brand);
      }
      for (const [productId, brand] of rebranded) {
        await request('PATCH', `/admin/products/${productId}`, { body: { brand: brand || null } });
      }
      return { unpriced: lines.length, items: [...new Set(lines.map((l) => l.productId))] };
    },
    onSuccess: async ({ unpriced, items }) => {
      toast.success(unpriced > 0 ? t('savedNeedPrice', { n: unpriced }) : t('saved'));
      await Promise.all(
        ['purchaseBills', 'products', 'stock', 'suppliers'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
      // The bill is in the Purchase bills history, which says what to do next.
      router.push(routes.purchaseBills({ saved: items, back }));
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  // Anything typed or chosen counts; the item brought in from "Buy it now" alone does not.
  const start = emptyLine(itemId);
  const lineTouched = (l: Line, i: number) =>
    (i > 0 && l.productId !== '') ||
    (i === 0 && l.productId !== start.productId) ||
    l.optionValueIds.length > 0 ||
    l.vat !== '0' ||
    l.remarks.trim() !== '' ||
    l.brand !== l.itemBrand ||
    [l.quantity, l.rate, l.expiresOn].some((v) => v.trim() !== '');
  const guard = useUnsavedGuard(
    !save.isSuccess &&
      (supplierId !== '' ||
        billNo.trim() !== '' ||
        note.trim() !== '' ||
        discount.trim() !== '' ||
        lines.length > 1 ||
        lines.some(lineTouched)),
  );

  return (
    <div className="grid max-w-[1700px] gap-6">
      {guard}

      {/* Many things from many bills at once: the same columns as this page, in Excel. */}
      <div className="flex flex-wrap items-center justify-end gap-2 text-sm text-muted-foreground">
        <span>{t('manyHint')}</span>
        <WorkbookUploadButton
          path="/admin/purchase-bills/sheet"
          templatePath="/admin/purchase-bills/sheet"
          title={t('manyTitle')}
          description={t('manyNote')}
          refresh={['purchaseBills', 'stock', 'products', 'suppliers']}
        />
      </div>

      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-3">
        <Field
          label={`${t('supplier')} *`}
          htmlFor="buy-supplier"
          error={showErrors && !supplierId ? t('needSupplier') : undefined}
        >
          <SearchSelect
            id="buy-supplier"
            source={choices.suppliers}
            value={supplierId}
            invalid={showErrors && !supplierId}
            onChange={(value) => setSupplierId(String(value))}
          />
          <button
            type="button"
            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={() => setAddingSupplier(true)}
          >
            <Icon name="plus" size={12} />
            {t('newSupplier')}
          </button>
        </Field>
        <Field
          label={`${t('billNo')} *`}
          htmlFor="buy-bill"
          hint={t('billNoHint')}
          error={showErrors && billNoProblem ? billNoProblem : undefined}
        >
          <Input
            id="buy-bill"
            aria-invalid={showErrors && billNoProblem ? true : undefined}
            value={billNo}
            maxLength={60}
            placeholder={t('billNoPlaceholder')}
            onChange={(e) => setBillNo(e.target.value)}
          />
        </Field>
        <Field label={t('day')} htmlFor="buy-day">
          <BsDatePicker
            id="buy-day"
            value={day}
            max={new Date().toISOString().slice(0, 10)}
            onChange={setDay}
          />
        </Field>
      </section>

      <section className="grid gap-3">
        <h2 className="font-heading text-base font-semibold">{t('what')}</h2>
        <p className="text-xs text-muted-foreground">{t('sheetNote')}</p>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[1180px] table-fixed border-separate border-spacing-0 text-sm">
            <colgroup>
              <col style={{ width: 32 }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 66 }} />
              <col style={{ width: 84 }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 92 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 40 }} />
            </colgroup>
            <thead className="bg-muted text-xs whitespace-nowrap text-muted-foreground">
              <tr>
                <th className={`${th} text-center`}>#</th>
                <th className={`${th} text-left`}>{t('item')} *</th>
                <th className={`${th} text-left`}>{t('brand')}</th>
                <th className={`${th} text-left`}>{t('colour')}</th>
                <th className={`${th} text-right`}>{t('quantity')} *</th>
                <th className={`${th} text-left`}>{t('unit')} *</th>
                <th className={`${th} text-left`}>{t('remarks')}</th>
                <th className={`${th} text-right`}>{t('rateCol')} *</th>
                <th className={`${th} text-left`}>{t('vat')}</th>
                <th className={`${th} text-left`}>{t('expires')}</th>
                <th className={`${th} text-right`}>{t('total')}</th>
                <th className="border-b border-border" />
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
                  onNewBrand={() => setBrandFor(index)}
                  onNewColour={() => void openColour(index)}
                  removable={lines.length > 1}
                  showErrors={showErrors}
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
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-sm tabular-nums">
            <dt className="text-muted-foreground">{t('grandTotal')}</dt>
            <dd className="text-right">{formatMoney(grand.toFixed(2), 'en')}</dd>
            <dt className="text-muted-foreground">{t('vatTotal')}</dt>
            <dd className="text-right">{formatMoney(vatTotal.toFixed(2), 'en')}</dd>
            <dt className="self-center text-muted-foreground">
              <label htmlFor="buy-discount">{t('discount')}</label>
            </dt>
            <dd className="text-right">
              <input
                id="buy-discount"
                inputMode="decimal"
                value={discount}
                placeholder="0"
                aria-invalid={discountBad || undefined}
                onChange={(e) => {
                  made.current = null;
                  setDiscount(e.target.value);
                }}
                className={cn(
                  'h-8 w-28 rounded-md border border-border bg-card px-2 text-right text-sm outline-none focus:border-primary',
                  discountBad && 'border-destructive',
                )}
              />
            </dd>
            {discountProblem ? (
              <dd role="alert" className="col-span-2 text-right text-xs text-destructive">
                {discountProblem}
              </dd>
            ) : null}
            <dt className="font-semibold">{t('payTotal')}</dt>
            <dd className="text-right font-semibold">
              {formatMoney(Math.max(0, billTotal - discountAmount).toFixed(2), 'en')}
            </dd>
          </dl>
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
          {!supplierId
            ? t('needSupplier')
            : (billNoProblem ?? firstProblem ?? discountProblem ?? billProblem ?? t('ready'))}
        </p>
        {/* Never greyed out: pressing it with something missing shows what, in red. */}
        <Button disabled={save.isPending} onClick={tryToSave}>
          {save.isPending ? tf('saving') : t('save')}
        </Button>
      </div>

      <CreateModal
        resource={supplierForm}
        open={addingSupplier}
        onOpenChange={setAddingSupplier}
        onCreated={(supplier) => {
          void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
          setSupplierId(supplier.id);
          toast.success(t('supplierAdded', { name: supplier.name }));
        }}
      />
      <CreateModal
        resource={brandsResource}
        open={brandFor !== null}
        onOpenChange={(open) => (open ? undefined : setBrandFor(null))}
        onCreated={(brand) => {
          if (brandFor !== null) change(brandFor, { brand: brand.name });
          toast.success(t('brandAdded', { name: brand.name }));
        }}
      />

      {colourForm ? (
        <CreateModal
          resource={colourForm}
          open={colourFor !== null}
          onOpenChange={(open) => (open ? undefined : setColourFor(null))}
          onCreated={(row) => {
            const created = row as unknown as { id: string; valueEn?: string };
            if (colourFor !== null) {
              const line = lines[colourFor];
              change(colourFor, { optionValueIds: [...(line?.optionValueIds ?? []), created.id] });
            }
            toast.success(t('colourAdded', { name: created.valueEn ?? '' }));
          }}
        />
      ) : null}

      <p className="text-xs text-muted-foreground">
        {t('packetsNote')}{' '}
        <Link href={routes.stock()} className="text-primary underline">
          {t('packetsLink')}
        </Link>
      </p>
    </div>
  );
}
