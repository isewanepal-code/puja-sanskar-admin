'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Fragment, useEffect, useMemo } from 'react';

import { SearchSelect } from '@/components/controls';
import { BsDatePicker } from '@/components/ui/bs-date-picker';
import { IconButton } from '@/components/ui/button';
import { allUnits, unitsFor } from '@/features/products';
import { request, type Schema } from '@/lib/api';
import { choices } from '@/lib/choices';
import { measureOf } from '@/lib/unit-measure';
import { cn } from '@/lib/utils';

import { box, cell, num, USUAL, vatOf, type Line } from './buy-line';

type Product = Schema<'AdminProductResponse'>;

// One thing bought, as one row of the sheet: the item, its colour or size, how much, what one cost and
// (if known) what one sells for.
export function LineRow({
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
  // Any unit of the shop can be bought in (a sack, a box, a roll); the ones the item is sold in come first.
  const sellBy = item.data?.sellBy;
  const sold = useQuery({
    queryKey: ['units-for', sellBy],
    queryFn: () => unitsFor(sellBy!).load(),
    enabled: Boolean(line.productId && sellBy),
    staleTime: 5 * 60 * 1000,
  });
  const every = useQuery({
    queryKey: ['units-all'],
    queryFn: () => allUnits.load(),
    enabled: Boolean(line.productId),
    staleTime: 5 * 60 * 1000,
  });
  const soldList = useMemo(
    () => (line.productId && sellBy ? (sold.data ?? []) : []),
    [line.productId, sellBy, sold.data],
  );
  const unitList = useMemo(
    () => (line.productId && sellBy ? (every.data ?? []) : []),
    [line.productId, sellBy, every.data],
  );
  const unitKnown = unitList.some((u) => u.value === line.unitId);
  // The usual unit is chosen for staff as soon as the item is known, and a unit that no longer
  // exists (left from another item) is replaced.
  useEffect(() => {
    if (unitList.length === 0 || soldList.length === 0 || unitKnown) return;
    const usual =
      soldList.find((u) => USUAL.includes((u.detail ?? '').toLowerCase())) ?? soldList[0]!;
    onChange({ unitId: usual.value });
  }, [unitList, soldList, unitKnown, onChange]);
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

  const boughtIn = unitList.find((u) => u.value === line.unitId);
  const unitSymbol = boughtIn?.detail ?? '';
  // The units a pack's contents are counted in: kg, litre, metre for a weighed item; its own for the rest.
  const measures = ['WEIGHT', 'VOLUME', 'LENGTH'].includes(sellBy ?? '')
    ? soldList.filter((u) => measureOf(1, u.detail ?? '') !== null)
    : soldList;
  // A sack of rice cannot be told apart from rice without the count; a box of pieces can be left plain.
  const needsHolds = Boolean(boughtIn) && !soldList.some((u) => u.value === line.unitId);
  const bigMeasure =
    measures.find((u) => ['kg', 'l', 'm', 'pc', 'pcs'].includes((u.detail ?? '').toLowerCase())) ??
    measures[0];
  const holdsUnitKnown = measures.some((u) => u.value === line.holdsUnitId);
  const holdsSymbol = measures.find((u) => u.value === line.holdsUnitId)?.detail ?? '';
  const unitLabel = boughtIn?.label ?? '';
  // The line is a pack (3 sacks of 25 kg) when a count is given in a unit other than the one bought.
  const container = num(line.holds) > 0 && holdsUnitKnown && line.holdsUnitId !== line.unitId;
  useEffect(() => {
    if (
      line.container !== container ||
      line.needsHolds !== needsHolds ||
      line.unitLabel !== unitLabel ||
      line.holdsSymbol !== holdsSymbol
    ) {
      onChange({ container, needsHolds, unitLabel, holdsSymbol });
    } else if (!holdsUnitKnown && bigMeasure && line.productId) {
      onChange({ holdsUnitId: bigMeasure.value });
    }
  }, [
    container,
    needsHolds,
    unitLabel,
    holdsSymbol,
    line.container,
    line.needsHolds,
    line.unitLabel,
    line.holdsSymbol,
    line.productId,
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
          <SearchSelect
            bare
            required
            aria-label={label(t('sellUnit'))}
            disabled={measures.length === 0}
            placeholder="—"
            options={measures}
            value={holdsUnitKnown ? line.holdsUnitId : ''}
            onChange={(value) => onChange({ holdsUnitId: String(value) })}
          />
        </td>
        <td className={cn(cell, bad(needsHolds && !(num(line.holds) > 0)))}>
          <input
            aria-label={label(t('holdsCol'))}
            inputMode="decimal"
            value={line.holds}
            disabled={!boughtIn || line.holdsUnitId === line.unitId}
            placeholder={needsHolds ? '25' : '—'}
            onChange={(e) => onChange({ holds: e.target.value })}
            className={`${box} text-right`}
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
          <td
            colSpan={12}
            className="border-b border-border px-3 py-1.5 text-sm text-muted-foreground"
          >
            {t('holdsTotal', {
              count: num(line.quantity) || 0,
              amount: `${num(line.holds)} ${holdsSymbol} / ${boughtIn?.label ?? ''}`,
              total: `${Math.round((num(line.quantity) || 0) * num(line.holds) * 1000) / 1000} ${holdsSymbol}`,
            })}
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}
