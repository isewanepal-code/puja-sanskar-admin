'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useMemo, useRef, useState, type ReactNode } from 'react';

import { SearchSelect } from '@/components/controls';
import { useToast } from '@/components/overlays';
import { Button, buttonVariants, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { isApiError, request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';
import { inUnit, measureOf, readable, type Measure } from '@/lib/unit-measure';

type Level = Schema<'StockLevelResponse'>;
type Product = Schema<'AdminProductResponse'>;
type Pack = Product['variants'][number];

const whole = (text: string) => Number(text) > 0;
const round = (n: number) => Math.round(n * 1000) / 1000;

// One numbered step of the form: what to do, in the order it is done.
function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span className="grid size-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">
          {n}
        </span>
        {title}
      </h3>
      <div className="grid gap-2 pl-8">{children}</div>
    </section>
  );
}

// Opens some of what was bought (a sack, a roll, loose pieces) into the sizes that are sold. Write how
// many packets of each size were made; how many of the bought pack that uses is worked out, and each
// size shows what it sells at and about what it costs, so a price that loses money is seen at once.
export function RepackForm({ level, onClose }: { level: Level | null; onClose: () => void }) {
  const t = useTranslations('repack');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = useRef(crypto.randomUUID());
  // null: worked out from the packets made; a number typed: what the shopkeeper says is opened.
  const [manualOpened, setManualOpened] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [sackAmount, setSackAmount] = useState('');
  const [sackUnit, setSackUnit] = useState('');
  const [note, setNote] = useState('');
  // Spilled, damaged or spoilt while opening: the only thing that counts as wastage.
  const [lost, setLost] = useState('');
  // Optional: how many of the bought pack will be opened, so the fill buttons know how much to fill.
  const product = useQuery({
    queryKey: ['products', 'repack', level?.product.id],
    queryFn: () => request<Product>('GET', `/admin/products/${level!.product.id}`),
    enabled: Boolean(level),
  });

  const packs = useMemo(() => product.data?.variants ?? [], [product.data]);
  const source = packs.find((pack) => pack.id === level?.variant.id);
  // Weights, volumes and lengths convert (200 g, 1 kg); pieces and sets compare with their own unit.
  const knownMeasure = (pack: Pack): Measure | null =>
    pack.pack ? measureOf(pack.pack.quantity, pack.pack.unit.symbol) : null;
  const measureOfPack = (pack: Pack): Measure | null =>
    knownMeasure(pack) ??
    (pack.pack && pack.pack.quantity > 0
      ? { kind: `UNIT:${pack.pack.unit.id}`, amount: pack.pack.quantity }
      : null);

  // The sizes on sale, small to large: the only ones packets are made of.
  const others = useMemo(
    () =>
      packs
        .filter((pack) => pack.id !== level?.variant.id && pack.isActive)
        .sort(
          (a, b) => (measureOfPack(a)?.amount ?? Infinity) - (measureOfPack(b)?.amount ?? Infinity),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [packs, level?.variant.id],
  );
  // The units a bought "Sack" may be said to hold: every unit of what the item is measured in.
  const allUnits = useQuery({
    queryKey: ['units', 'all'],
    queryFn: () =>
      request<{
        items: Array<{ id: string; symbol: string; nameNe: string; dimension: string }>;
      }>('GET', '/admin/units', { query: { limit: 100 } }),
    enabled: Boolean(level),
    staleTime: 600_000,
  });
  const units = useMemo(() => {
    const seen = new Map<string, { id: string; symbol: string; label: string }>();
    const dimensions = new Set(
      packs.flatMap((pack) => {
        const kind = knownMeasure(pack)?.kind;
        return kind ? [kind] : [];
      }),
    );
    for (const unit of allUnits.data?.items ?? []) {
      if (dimensions.has(unit.dimension)) {
        seen.set(unit.id, {
          id: unit.id,
          symbol: unit.symbol,
          label: `${unit.nameNe} (${unit.symbol})`,
        });
      }
    }
    // Pieces, sets and the like: the unit the small packs are counted in (a box holds 12 pcs).
    for (const pack of packs) {
      if (pack.pack && !knownMeasure(pack) && !seen.has(pack.pack.unit.id)) {
        seen.set(pack.pack.unit.id, {
          id: pack.pack.unit.id,
          symbol: pack.pack.unit.symbol,
          label: `${pack.pack.unit.nameNe} (${pack.pack.unit.symbol})`,
        });
      }
    }
    return [...seen.values()];
  }, [packs, allUnits.data]);
  const symbolOf = (id: string) => units.find((u) => u.id === id)?.symbol;

  const sourceMeasure = source ? measureOfPack(source) : null;
  // A bought "Sack" that does not say what it weighs, while the sizes made are weighed: ask once.
  const needsSize = Boolean(source) && !(source && knownMeasure(source)) && units.length > 0;
  const largest = others.filter((pack) => measureOfPack(pack)).at(-1);
  const bigUnit = units.find((u) => ['kg', 'l', 'm'].includes(u.symbol.toLowerCase()));
  const unitChosen = sackUnit || bigUnit?.id || largest?.pack?.unit.id || units[0]?.id || '';
  const sackMeasure = needsSize
    ? (measureOf(Number(sackAmount), symbolOf(unitChosen)) ??
      (Number(sackAmount) > 0 && unitChosen
        ? { kind: `UNIT:${unitChosen}`, amount: Number(sackAmount) }
        : null))
    : null;
  const bulk = needsSize ? sackMeasure : sourceMeasure;

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
  // The "how many sacks do you open" box is hidden for now (it confused); a size fills one sack at a time.
  const target = 0;
  const worked =
    canWork && bulk && madeAmount > 0
      ? fractional
        ? round((madeAmount + lostBase) / bulk.amount)
        : Math.max(1, Math.ceil(madeAmount / bulk.amount - 1e-9))
      : 0;
  const openedNumber = !fractional && manualOpened !== null ? Number(manualOpened) || 0 : worked;
  const openedAmount = bulk ? bulk.amount * openedNumber : 0;
  const left = openedAmount - madeAmount;
  const tooMuch = !fractional && canWork && openedAmount > 0 && left < -0.0005;
  const tooMany = level ? openedNumber > level.available + 1e-9 : false;

  const kind = bulk?.kind;
  const sourceSymbol = needsSize ? (symbolOf(unitChosen) ?? '') : (source?.pack?.unit.symbol ?? '');
  const unitSymbol = kind ? readable(openedAmount, kind, sourceSymbol).symbol : '';
  const inShown = (amount: number) => round(inUnit(Math.max(amount, 0), unitSymbol));

  // What a packet costs: the bought price shared over the packets by size.
  const costOfOne = level ? Number(level.avgCost) : 0;
  const costOf = (pack: Pack): number | null => {
    const m = measureOfPack(pack);
    if (!bulk || !m || m.kind !== bulk.kind || costOfOne <= 0) return null;
    return (costOfOne / bulk.amount) * m.amount;
  };

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
      if (needsSize && source && product.data) {
        // The bought pack now states its size, so the packets can be set against it (and the cost shared).
        await request('PATCH', `/admin/products/${product.data.id}/variants/${source.id}`, {
          body: { packQuantity: Number(sackAmount), packUnitId: unitChosen },
        });
      }
      return request('POST', '/admin/stock-repacks', {
        headers: { 'Idempotency-Key': key.current },
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
    const others = madeAmount - contribution(pack);
    // Weighed goods: as many as fill the sack being opened (as many sacks as the others already need).
    const total = fractional
      ? target > 0
        ? target
        : Math.max(1, Math.ceil((others + m.amount) / bulk.amount - 1e-9)) * bulk.amount
      : (openedNumber || 1) * bulk.amount;
    const rest = total - (madeAmount - contribution(pack));
    setCount(pack.id, String(Math.max(Math.floor(rest / m.amount + 1e-9), 0)));
  };
  const example = others[0]?.label;

  return (
    <Modal
      open
      onOpenChange={(next) => (next ? undefined : onClose())}
      size="lg"
      title={t('title', { name: `${level.product.nameNe} · ${label}` })}
      description={t('note')}
      footer={
        <>
          <div className="mr-auto text-sm text-muted-foreground">
            {tooMany ? (
              <div className="text-destructive">
                {t('moreThanOnHand', { count: level.available })}
              </div>
            ) : null}
            {missing.length > 0 ? (
              <div className="text-destructive">
                {tf('stillNeeded', { fields: missing.join(', ') })}
              </div>
            ) : null}
          </div>
          <Button variant="secondary" onClick={onClose}>
            {tf('cancel')}
          </Button>
          <Button disabled={!ready || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? tf('saving') : t('submit')}
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        {madeByOpening ? (
          <div
            role="alert"
            className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm"
          >
            {t('madeByOpening', { label })}
          </div>
        ) : null}
        <Step n={1} title={t('step1', { label })}>
          <p className="text-sm text-muted-foreground">
            {t('onHand', { count: level.available })}
            {costOfOne > 0
              ? ` · ${t('boughtAt', { cost: formatMoney(String(costOfOne), 'en') })}`
              : ''}
            {source && knownMeasure(source) && sourceMeasure
              ? ` · ${t('bulkKnown', {
                  label,
                  size: `${readable(sourceMeasure.amount, sourceMeasure.kind).value} ${readable(sourceMeasure.amount, sourceMeasure.kind).symbol}`,
                })}`
              : ''}
          </p>
          {needsSize ? (
            <div className="grid gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-sm font-medium">{t('sackTitle', { label })}</p>
              <p className="text-xs text-muted-foreground">{t('sackNote')}</p>
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
        </Step>

        <Step n={2} title={t('madeTitle')}>
          <p className="text-xs text-muted-foreground">
            {t('madeNote')}
            {example ? ` ${t('madeExample', { size: example })}` : ''}
          </p>
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
            <div className="grid gap-1.5">
              <div className="grid grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_6.5rem_2.25rem] gap-2 px-3 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                <span>{t('colSize')}</span>
                <span className="text-right">{t('colSells')}</span>
                <span className="text-right">{t('colCost')}</span>
                <span className="text-right">{t('colMade')}</span>
                <span />
              </div>
              {others.map((pack) => {
                const cost = costOf(pack);
                const sells = Number(pack.price);
                const losing = cost !== null && sells > 0 && sells < cost - 0.005;
                return (
                  <div
                    key={pack.id}
                    className="grid grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_6.5rem_2.25rem] items-center gap-2 rounded-md border border-border px-3 py-1.5"
                  >
                    <span className="text-sm font-medium">{pack.label}</span>
                    <span className="text-right text-sm tabular-nums">
                      {sells > 0 ? formatMoney(String(sells), 'en') : '—'}
                    </span>
                    <span
                      className={`text-right text-sm tabular-nums ${losing ? 'text-destructive' : 'text-muted-foreground'}`}
                      title={losing ? t('belowCost') : undefined}
                    >
                      {cost !== null ? `≈ ${formatMoney(String(round(cost)), 'en')}` : '—'}
                    </span>
                    <Input
                      aria-label={`${pack.label}: ${t('howMany')}`}
                      inputMode="decimal"
                      placeholder={t('countPlaceholder')}
                      className="h-8 text-right"
                      value={counts[pack.id] ?? ''}
                      onChange={(e) => setCount(pack.id, e.target.value)}
                    />
                    <IconButton
                      icon="refresh"
                      label={t('fill')}
                      disabled={!bulk || !measureOfPack(pack)}
                      onClick={() => fill(pack)}
                    />
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">
                {t('missingSize')}{' '}
                <Link
                  href={routes.quantityPrice(level.product.id)}
                  className="text-primary underline"
                >
                  {t('setSizes')}
                </Link>
              </p>
            </div>
          ) : null}
        </Step>

        <Step n={3} title={t('usesTitle')}>
          {fractional && bulk ? (
            <div className="grid gap-2">
              {worked > 0 ? (
                <p className="text-sm">
                  <strong>
                    {t('usesPart', {
                      count: worked,
                      label,
                      amount: `${readable(openedAmount, bulk.kind, sourceSymbol).value} ${readable(openedAmount, bulk.kind, sourceSymbol).symbol}`,
                    })}
                  </strong>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{t('usesWaiting')}</p>
              )}
              {worked > 0 ? (
                <p className={`text-sm ${tooMany ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {t('staysOnShelf', {
                    count: round(level.available - worked),
                    label,
                    amount: `${readable(Math.max(level.available - worked, 0) * bulk.amount, bulk.kind, sourceSymbol).value} ${readable(Math.max(level.available - worked, 0) * bulk.amount, bulk.kind, sourceSymbol).symbol}`,
                  })}
                </p>
              ) : null}
              <div className="grid gap-1">
                <label htmlFor="repack-lost" className="text-sm font-medium">
                  {t('lostLabel')}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="repack-lost"
                    inputMode="decimal"
                    placeholder="0"
                    className="max-w-28"
                    value={lost}
                    onChange={(e) => setLost(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {source?.pack?.unit.symbol ?? symbolOf(unitChosen)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{t('lostHint')}</p>
              </div>
            </div>
          ) : (
            <>
              {canWork && manualOpened === null ? (
                <p className="text-sm">
                  {worked > 0 ? (
                    <>
                      <strong>{t('usesAuto', { count: worked, label })}</strong>{' '}
                      <button
                        type="button"
                        className="text-primary underline"
                        onClick={() => setManualOpened(String(worked))}
                      >
                        {t('change')}
                      </button>
                    </>
                  ) : (
                    <span className="text-muted-foreground">{t('usesWaiting')}</span>
                  )}
                </p>
              ) : (
                <div className="grid gap-1">
                  <Input
                    id="repack-opened"
                    aria-label={t('opened', { label })}
                    inputMode="decimal"
                    placeholder={t('openedPlaceholder')}
                    className="max-w-32"
                    value={manualOpened ?? ''}
                    onChange={(e) => setManualOpened(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('opened', { label })}{' '}
                    {canWork ? (
                      <button
                        type="button"
                        className="text-primary underline"
                        onClick={() => setManualOpened(null)}
                      >
                        {t('workItOut')}
                      </button>
                    ) : null}
                  </p>
                </div>
              )}
              {openedNumber > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('shelfAfter', {
                    opened: openedNumber,
                    label,
                    left: round(level.available - openedNumber),
                  })}
                </p>
              ) : null}
              {bulk && openedAmount > 0 && madeAmount > 0 ? (
                <div
                  role="status"
                  className={`rounded-md border px-3 py-2 text-sm ${tooMuch ? 'border-destructive text-destructive' : 'border-border'}`}
                >
                  {tooMuch
                    ? t('tooMuch', {
                        made: inShown(madeAmount),
                        opened: inShown(openedAmount),
                        unit: unitSymbol,
                      })
                    : left > 0.0005
                      ? t('notMade', { left: inShown(left), unit: unitSymbol })
                      : t('allMade')}
                </div>
              ) : madeCount > 0 && openedNumber > 0 && !bulk ? (
                <p className="text-xs text-muted-foreground">{t('noCompare')}</p>
              ) : null}
            </>
          )}
        </Step>

        <div className="grid gap-1">
          <label htmlFor="repack-note" className="text-sm font-medium">
            {t('noteLabel')}
          </label>
          <Input
            id="repack-note"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
