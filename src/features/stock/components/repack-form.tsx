'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { useToast } from '@/components/overlays';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { isApiError, request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';
import { inUnit, measureOf, readable } from '@/lib/unit-measure';

import {
  costOfPack,
  fillCount,
  knownMeasure,
  looseCountOf,
  measureOfPack,
  round,
  sizesToMake,
  unitChoices,
  whole,
  workedPacks,
  type Pack,
  type UnitRow,
} from './repack-math';
import { RepackSizesTable } from './repack-sizes-table';
import { RepackSum } from './repack-sum';

type Level = Schema<'StockLevelResponse'>;
type Product = Schema<'AdminProductResponse'>;

// Opens some of what was bought (a sack, a roll, loose pieces) into the sizes that are sold. Write how
// many packets of each size were made; how many of the bought pack that uses is worked out, and each
// size shows what it sells at and about what it costs, so a price that loses money is seen at once.
export type RepackPrefill = {
  counts: Record<string, string>;
  note: string;
  // Editing packets already made: those are put back first (this much of the opened pack returns).
  undo?: { reference: string; sourceQuantity: number; date: string };
};

export function RepackForm({
  level,
  onClose,
  prefill,
}: {
  level: Level | null;
  onClose: () => void;
  // The numbers of packet-making being edited, to change and save again.
  prefill?: RepackPrefill;
}) {
  const t = useTranslations('repack');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = useRef(crypto.randomUUID());
  // null: worked out from the packets made; a number typed: what the shopkeeper says is opened.
  const [manualOpened, setManualOpened] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>(prefill?.counts ?? {});
  const [sackAmount, setSackAmount] = useState('');
  const [sackUnit, setSackUnit] = useState('');
  const [note, setNote] = useState(prefill?.note ?? '');
  // Spilled, damaged or spoilt while opening: the only thing that counts as wastage.
  const [lost, setLost] = useState('');
  const product = useQuery({
    queryKey: ['products', 'repack', level?.product.id],
    queryFn: () => request<Product>('GET', `/admin/products/${level!.product.id}`),
    enabled: Boolean(level),
  });

  const packs = useMemo(() => product.data?.variants ?? [], [product.data]);
  const source = packs.find((pack) => pack.id === level?.variant.id);
  const others = useMemo(() => sizesToMake(packs, level?.variant.id), [packs, level?.variant.id]);
  // The units a bought "Sack" may be said to hold: every unit of what the item is measured in.
  const allUnits = useQuery({
    queryKey: ['units', 'all'],
    queryFn: () => request<{ items: UnitRow[] }>('GET', '/admin/units', { query: { limit: 100 } }),
    enabled: Boolean(level),
    staleTime: 600_000,
  });
  const units = useMemo(
    () => unitChoices(packs, allUnits.data?.items ?? []),
    [packs, allUnits.data],
  );
  const symbolOf = (id: string) => units.find((u) => u.id === id)?.symbol;

  const sourceMeasure = source ? measureOfPack(source) : null;
  // A bought "Sack" that does not say what it weighs, while the sizes made are weighed: ask once.
  // Loose pieces ("1 pcs") are one piece each: nothing to ask.
  const looseCount = source && !source.pack ? looseCountOf(source.label) : NaN;
  const loose = looseCount > 0;
  const needsSize =
    Boolean(source) && !(source && knownMeasure(source)) && units.length > 0 && !loose;
  const largest = others.filter((pack) => measureOfPack(pack)).at(-1);
  const bigUnit = units.find((u) => ['kg', 'l', 'm'].includes(u.symbol.toLowerCase()));
  const unitChosen = sackUnit || bigUnit?.id || largest?.pack?.unit.id || units[0]?.id || '';
  const sackMeasure = needsSize
    ? (measureOf(Number(sackAmount), symbolOf(unitChosen)) ??
      (Number(sackAmount) > 0 && unitChosen
        ? { kind: `UNIT:${unitChosen}`, amount: Number(sackAmount) }
        : null))
    : null;
  const looseUnit = others.find((pack) => pack.pack && !knownMeasure(pack))?.pack?.unit.id;
  const looseMeasure =
    loose && looseUnit ? { kind: `UNIT:${looseUnit}`, amount: looseCount } : null;
  const bulk = needsSize ? sackMeasure : (sourceMeasure ?? looseMeasure);

  const contribution = (pack: Pack) => {
    const m = measureOfPack(pack);
    return m ? m.amount * (Number(counts[pack.id]) || 0) : 0;
  };
  const madeAmount = others.reduce((sum, pack) => sum + contribution(pack), 0);
  const madeCount = others.reduce((sum, pack) => sum + (Number(counts[pack.id]) || 0), 0);
  // Every size made is measured on the same scale as what is opened: the numbers can be worked out.
  const canWork =
    Boolean(bulk) &&
    others.every(
      (pack) => !whole(counts[pack.id] ?? '') || measureOfPack(pack)?.kind === bulk?.kind,
    );
  // Things sold by weight, volume or length may use part of a pack (0.6 of a 25 kg sack): what is not made
  // stays on the shelf. Pieces and sets open whole packs only.
  const fractional =
    ['WEIGHT', 'VOLUME', 'LENGTH'].includes(product.data?.sellBy ?? '') &&
    canWork &&
    (bulk?.kind === 'WEIGHT' || bulk?.kind === 'VOLUME' || bulk?.kind === 'LENGTH');
  const lostBase = fractional
    ? (measureOf(Number(lost) || 0, source?.pack?.unit.symbol ?? symbolOf(unitChosen))?.amount ?? 0)
    : 0;
  const worked = workedPacks({
    canWork,
    bulkAmount: bulk?.amount,
    madeAmount,
    lostBase,
    fractional,
  });
  const openedNumber = !fractional && manualOpened !== null ? Number(manualOpened) || 0 : worked;
  const openedAmount = bulk ? bulk.amount * openedNumber : 0;
  const left = openedAmount - madeAmount;
  const tooMuch = !fractional && canWork && openedAmount > 0 && left < -0.0005;
  // What can be opened: what is in stock, and what editing puts back.
  const canOpen = (level?.available ?? 0) + (prefill?.undo?.sourceQuantity ?? 0);
  const tooMany = level ? openedNumber > canOpen + 1e-9 : false;

  const kind = bulk?.kind;
  const sourceSymbol = needsSize ? (symbolOf(unitChosen) ?? '') : (source?.pack?.unit.symbol ?? '');
  const unitSymbol = kind ? readable(openedAmount, kind, sourceSymbol).symbol : '';
  const inShown = (amount: number) => round(inUnit(Math.max(amount, 0), unitSymbol));

  // What a packet costs: the bought price shared over the packets by size.
  const costOfOne = level ? Number(level.avgCost) : 0;
  const costOf = (pack: Pack) => costOfPack(costOfOne, bulk, measureOfPack(pack));

  const outputs = others
    .filter((pack) => whole(counts[pack.id] ?? ''))
    .map((pack) => ({ variantId: pack.id, quantity: Number(counts[pack.id]) }));
  const missing = [
    needsSize && !sackMeasure && t('sackAmount'),
    others.length === 0 && t('noSizesShort'),
    others.length > 0 && outputs.length === 0 && t('madeTitle'),
    outputs.length > 0 && !(openedNumber > 0) && t('usesTitle'),
  ].filter(Boolean);
  // What was made by opening is the end of the line: it is not opened again.
  const madeByOpening = level ? !level.boughtIn : false;
  const ready = !madeByOpening && !tooMuch && !tooMany && missing.length === 0;

  const save = useMutation({
    mutationFn: async () => {
      if (prefill?.undo) {
        // The old packets go back first; then these are made.
        await request(
          'POST',
          `/admin/stock-repacks/${encodeURIComponent(prefill.undo.reference)}/undo`,
          { headers: { 'X-Branch': level!.branch.code } },
        );
      }
      if (needsSize && source && product.data) {
        // The bought pack now states its size, so the packets can be set against it (and the cost shared).
        await request('PATCH', `/admin/products/${product.data.id}/variants/${source.id}`, {
          body: { packQuantity: Number(sackAmount), packUnitId: unitChosen },
        });
      }
      return request('POST', '/admin/stock-repacks', {
        headers: { 'Idempotency-Key': key.current, 'X-Branch': level!.branch.code },
        body: {
          sourceVariantId: level!.variant.id,
          sourceQuantity: openedNumber,
          // Wastage is only what the shopkeeper says was lost: nothing is worked out for them.
          note:
            [
              note.trim(),
              fractional && lostBase > 0 ? `Wastage ${lost.trim()} ${sourceSymbol}` : '',
            ]
              .filter(Boolean)
              .join('. ') || null,
          outputs,
        },
      });
    },
    onSuccess: async () => {
      toast.success(t('done'));
      await Promise.all(
        ['stock', 'products'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })),
      );
      onClose();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  if (!level) return null;
  const label = level.variant.label;
  const setCount = (id: string, value: string) => setCounts((all) => ({ ...all, [id]: value }));
  // As many of one size as the rest of what is opened makes.
  const fill = (pack: Pack) => {
    const m = measureOfPack(pack);
    if (!m || !bulk) return;
    const rest = madeAmount - contribution(pack);
    setCount(
      pack.id,
      String(
        fillCount({
          packAmount: m.amount,
          bulkAmount: bulk.amount,
          rest,
          fractional,
          openedNumber,
        }),
      ),
    );
  };
  const stockNow = round(canOpen);
  const stockAfter = round(canOpen - openedNumber);
  const opensText =
    fractional && bulk
      ? `${worked} ${label} (${readable(openedAmount, bulk.kind, sourceSymbol).value} ${readable(openedAmount, bulk.kind, sourceSymbol).symbol})`
      : `${openedNumber} ${label}`;

  return (
    <Modal
      open
      onOpenChange={(next) => (next ? undefined : onClose())}
      size="lg"
      title={
        prefill?.undo
          ? t('editTitle', { name: label })
          : t('title', { name: `${level.product.nameNe} · ${label}` })
      }
      footer={
        <>
          <div className="mr-auto text-sm text-destructive">
            {tooMany ? t('moreThanOnHand', { count: canOpen }) : null}
            {!tooMany && missing.length > 0 && madeCount + (needsSize ? 1 : 0) > 0
              ? tf('stillNeeded', { fields: missing.join(', ') })
              : null}
          </div>
          <Button variant="secondary" onClick={onClose}>
            {tf('cancel')}
          </Button>
          <Button disabled={!ready || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? tf('saving') : prefill?.undo ? t('saveEdit') : t('submit')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {madeByOpening ? (
          <div
            role="alert"
            className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm"
          >
            {t('madeByOpening', { label })}
          </div>
        ) : null}
        {prefill?.undo ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            {t('editBanner', { date: prefill.undo.date })}
          </div>
        ) : null}

        <p className="text-sm text-muted-foreground">
          {t('stockLine', { count: stockNow, label })}
          {costOfOne > 0
            ? ` · ${t('boughtAt', { cost: formatMoney(String(costOfOne), 'en') })}`
            : ''}
        </p>

        {needsSize ? (
          <div className="grid gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-medium">{t('sackTitle', { label })}</p>
            <div className="grid max-w-sm grid-cols-[7rem_1fr] gap-2">
              <Input
                aria-label={t('sackAmount')}
                inputMode="decimal"
                placeholder="50"
                value={sackAmount}
                onChange={(e) => setSackAmount(e.target.value)}
              />
              <SearchSelect
                aria-label={t('newUnit')}
                options={units.map((u) => ({ value: u.id, label: u.label }))}
                value={unitChosen}
                onChange={(value) => setSackUnit(String(value))}
              />
            </div>
          </div>
        ) : null}

        {product.isPending ? <p className="text-sm text-muted-foreground">…</p> : null}
        {!product.isPending && others.length === 0 ? (
          <div
            role="alert"
            className="grid gap-2 rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm"
          >
            <p>{t('noSizes')}</p>
            <Link
              href={routes.quantityPrice(level.product.id)}
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              {t('setSizes')}
            </Link>
          </div>
        ) : null}

        {others.length > 0 ? (
          <RepackSizesTable
            sizes={others}
            counts={counts}
            costOf={costOf}
            canFill={(pack) => Boolean(bulk && measureOfPack(pack))}
            onCount={setCount}
            onFill={fill}
          />
        ) : null}

        {openedNumber > 0 ? (
          <RepackSum
            made={others
              .filter((pack) => whole(counts[pack.id] ?? ''))
              .map((pack) => `${counts[pack.id]} × ${pack.label}`)
              .join(' + ')}
            opens={opensText}
            label={label}
            stockNow={stockNow}
            opened={openedNumber}
            stockAfter={stockAfter}
            tooMany={tooMany}
            tooMuch={tooMuch}
            showLeft={Boolean(bulk) && left > 0.0005}
            madeShown={inShown(madeAmount)}
            openedShown={inShown(openedAmount)}
            leftShown={inShown(left)}
            unit={unitSymbol}
          />
        ) : null}

        {fractional ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label htmlFor="repack-lost" className="font-medium">
              {t('lostLabel')}
            </label>
            <Input
              id="repack-lost"
              inputMode="decimal"
              placeholder="0"
              className="h-8 max-w-24"
              value={lost}
              onChange={(e) => setLost(e.target.value)}
            />
            <span className="text-muted-foreground">
              {source?.pack?.unit.symbol ?? symbolOf(unitChosen)}
            </span>
          </div>
        ) : !fractional && canWork && manualOpened !== null ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label htmlFor="repack-opened" className="font-medium">
              {t('opened', { label })}
            </label>
            <Input
              id="repack-opened"
              inputMode="decimal"
              className="h-8 max-w-24"
              value={manualOpened ?? ''}
              onChange={(e) => setManualOpened(e.target.value)}
            />
            <button
              type="button"
              className="text-primary underline"
              onClick={() => setManualOpened(null)}
            >
              {t('workItOut')}
            </button>
          </div>
        ) : null}

        <Input
          id="repack-note"
          aria-label={t('noteLabel')}
          placeholder={t('noteLabel')}
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Modal>
  );
}
