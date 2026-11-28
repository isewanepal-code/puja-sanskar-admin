'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ChipInput, SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { ConfirmDialog, useToast } from '@/components/overlays';
import { ImagesInput } from '@/components/resource/image-inputs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError, request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { choices, packsIn } from '@/lib/choices';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useUnsavedGuard } from '@/lib/use-unsaved-guard';

import {
  repeatedRows,
  blankRows,
  codeOf,
  emptyPkg,
  inSection,
  OPEN_ROWS,
  SECTIONS,
  TIERS,
  type Pkg,
  type Section,
  type Row,
  type Tier,
} from './kit-package';
import { createSet, updateSet } from '../lib/kit-set-save';
import { kitSetKey, packagesFromSet, pkgFromKit, type Kit } from '../lib/kit-set';
import { KitRowsTable } from './kit-rows-table';
import { KitOffersPanel } from './kit-offers-panel';
import { PriceLine } from './kit-price-line';

// A kit in one page: its name once, then the Basic, Standard and Premium packages, each with its own
// photos, discount and items. One Save makes them all; given a saved set, it changes that set instead.
export function KitSetEditor({ existing }: { existing?: Kit[] }) {
  const t = useTranslations('kitPage');
  const tf = useTranslations('forms');
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  // The puja this kit is for is optional: it only ties the kit to the puja (and fills the items).
  const saved = existing?.[0];
  const [pujaId, setPujaId] = useState(saved?.puja?.id ?? '');
  const [nameNe, setNameNe] = useState(saved?.nameNe ?? '');
  const [nameEn, setNameEn] = useState(saved?.nameEn ?? '');
  const [nameRomanized, setNameRomanized] = useState(saved?.nameRomanized ?? '');
  const [aliases, setAliases] = useState(saved?.aliases.join(',') ?? '');
  const [description, setDescription] = useState(saved?.description ?? '');
  const [images, setImages] = useState(() =>
    JSON.stringify(
      (saved?.images ?? []).map(({ url, altText }) => ({ url, altText: altText ?? null })),
    ),
  );
  const [tier, setTier] = useState<Tier>(saved?.tier ?? 'BASIC');
  const [packages, setPackages] = useState<Record<Tier, Pkg>>(() =>
    existing
      ? packagesFromSet(existing)
      : { BASIC: emptyPkg(true), STANDARD: emptyPkg(false), PREMIUM: emptyPkg(false) },
  );
  const pkg = packages[tier];
  // Hawan samagri is chosen from its own category (4.4); without that category, from every pack.
  const categories = useQuery({
    queryKey: ['categories', 'hawan'],
    staleTime: 600_000,
    queryFn: () =>
      request<{ items: { id: string; code: string; nameNe: string }[] }>(
        'GET',
        '/admin/categories',
        {
          query: { limit: 100 },
        },
      ),
  });
  const hawanCategory = categories.data?.items.find(
    (c) => c.code === 'CAT_4_4' || c.nameNe.includes('हवन'),
  );
  const sourceFor = (section: Section) =>
    section === 'hawan' && hawanCategory ? packsIn(hawanCategory.id) : choices.packs;
  const hasChosen = pkg.rows.some((row) => row.variantId);
  // A package can take the items of one made before it: Standard from Basic, Premium from either.
  const copySources = TIERS.filter(
    (name) =>
      TIERS.indexOf(name) < TIERS.indexOf(tier) && packages[name].rows.some((r) => r.variantId),
  );
  // The package waiting for the "replace what is chosen?" answer.
  const [copying, setCopying] = useState<Tier | null>(null);
  const copyFrom = (from: Tier) => {
    setPackages((all) => ({
      ...all,
      [tier]: {
        ...all[tier],
        rows: all[from].rows.map((row) => ({ ...row })),
        hawanOptional: all[from].hawanOptional,
      },
    }));
    setCopying(null);
  };
  // The items of another kit, added to what is chosen; an item already here is not added twice.
  const [pulling, setPulling] = useState(false);
  // Where each package's pulled items came from, so it stays readable after the pick resets.
  const [pulledFrom, setPulledFrom] = useState<Record<string, string[]>>({});
  const pullFrom = async (kitId: string) => {
    if (!kitId) return;
    setPulling(true);
    try {
      const source = await request<Kit>('GET', `/admin/kits/${kitId}`);
      const other = pkgFromKit(source);
      const here = pkg.rows.filter((row) => row.variantId);
      const known = new Set(here.map(itemOf));
      const added = other.rows.filter((row) => row.variantId && !known.has(itemOf(row)));
      const keep = (section: Section) => here.filter((row) => inSection(row, section));
      const take = (section: Section) => added.filter((row) => inSection(row, section));
      change({
        rows: SECTIONS.flatMap((section) => [
          ...keep(section),
          ...take(section),
          ...blankRows(
            section,
            Math.max(3, OPEN_ROWS[section] - keep(section).length - take(section).length),
          ),
        ]),
      });
      const from = source.tier ? `${source.nameNe} · ${source.tier}` : source.nameNe;
      setPulledFrom((all) => ({
        ...all,
        [tier]: [...(all[tier] ?? []), t('pulledFrom', { kit: from, count: added.length })],
      }));
      toast.success(t('pulled', { count: added.length }));
    } catch (error) {
      toast.error(isApiError(error) ? error.message : tf('failed'));
    } finally {
      setPulling(false);
    }
  };
  const change = (patch: Partial<Pkg>) =>
    setPackages((all) => ({ ...all, [tier]: { ...all[tier], ...patch } }));
  // A row waiting for the "really delete?" answer.
  const [removing, setRemoving] = useState<number | null>(null);
  const dropRow = (index: number) => {
    change({ rows: pkg.rows.filter((_, i) => i !== index) });
  };
  const changeRow = (index: number, patch: Partial<Row>) =>
    change({ rows: pkg.rows.map((row, i) => (i === index ? { ...row, ...patch } : row)) });

  // The puja's samagri as the kit's items, each ticked Optional as the puja lists it; only into an empty package.
  const fillFromPuja = async (id: string) => {
    if (!id || pkg.rows.some((row) => row.variantId)) return;
    try {
      const plan = await request<{
        items: { variantId: string; quantity: number; optional: boolean }[];
        skipped: unknown[];
      }>('GET', '/admin/kits/puja-plan', { query: { pujaId: id } });
      const main = [
        ...plan.items.filter((l) => !l.optional),
        ...plan.items.filter((l) => l.optional),
      ].map((line) => ({
        variantId: line.variantId,
        quantity: String(line.quantity),
        optional: line.optional,
        hawan: false,
      }));
      change({
        rows: [
          ...main,
          ...blankRows('main', Math.max(OPEN_ROWS.main - main.length, 3)),
          ...pkg.rows.filter((row) => row.hawan && row.variantId),
          ...blankRows('hawan', OPEN_ROWS.hawan),
        ],
      });
      toast.success(t('filled', { count: plan.items.length, skipped: plan.skipped.length }));
    } catch (error) {
      toast.error(isApiError(error) ? error.message : tf('failed'));
    }
  };

  // What each chosen pack sells at today, to show the line prices, the total and what a discount leaves.
  const wanted = [
    ...new Set(
      TIERS.flatMap((name) => packages[name].rows.map((row) => row.variantId)).filter(Boolean),
    ),
  ];
  const priced = useQueries({
    queries: wanted.map((variantId) => ({
      queryKey: ['kit-pack-price', variantId],
      staleTime: 60_000,
      queryFn: async () => {
        const { items } = await request<{ items: Schema<'AdminProductResponse'>[] }>(
          'GET',
          '/admin/products',
          { query: { variantId, limit: 1 } },
        );
        const found = items.flatMap((item) => item.variants).find((v) => v.id === variantId);
        const owner = items.find((item) => item.variants.some((v) => v.id === variantId));
        return {
          variantId,
          productId: owner?.id ?? '',
          price: Number(found?.price ?? 0),
          cost: Number(found?.cost ?? 0),
        };
      },
    })),
  });
  const priceOf = (variantId: string) =>
    priced.find((q) => q.data?.variantId === variantId)?.data?.price ?? 0;
  const costOf = (variantId: string) =>
    priced.find((q) => q.data?.variantId === variantId)?.data?.cost ?? 0;
  const itemOf = (row: Row) =>
    row.productId ||
    (priced.find((q) => q.data?.variantId === row.variantId)?.data?.productId ?? '');
  const repeated = new Set(repeatedRows(pkg.rows, itemOf));
  const lineTotal = (row: Row) => priceOf(row.variantId) * (Number(row.quantity) || 0);
  // The kit costs what its compulsory items (and compulsory hawan samagri) cost; optional ones are
  // priced on the side and take no discount.
  const sumOf = (pick: (r: Row) => boolean) =>
    pkg.rows.filter(pick).reduce((sum, r) => sum + lineTotal(r), 0);
  const optionalRow = (r: Row) => (r.hawan ? pkg.hawanOptional : r.optional);
  const itemsSum = sumOf((r) => !optionalRow(r) && !r.hawan);
  const hawanSum = sumOf((r) => !optionalRow(r) && r.hawan);
  const oldPrice = itemsSum + hawanSum;
  const optionalItemsSum = sumOf((r) => optionalRow(r) && !r.hawan);
  const optionalHawanSum = sumOf((r) => optionalRow(r) && r.hawan);
  const off = Number(pkg.discount) || 0;
  const taken = Math.min(
    pkg.discountKind === 'PERCENT' ? (oldPrice * Math.min(off, 100)) / 100 : off,
    oldPrice,
  );
  const salePrice = Math.max(oldPrice - taken, 0);
  // Each compulsory line carries its share of the discount, so every line can be checked by hand.
  const keep = oldPrice > 0 ? salePrice / oldPrice : 1;
  const afterOf = (row: Row) => (optionalRow(row) ? null : lineTotal(row) * keep);

  const chosen = TIERS.filter((name) => packages[name].on);
  // What still keeps Save off, named, so nobody has to guess.
  const missing = [
    !nameNe.trim() && t('nameNe'),
    !nameEn.trim() && t('nameEn'),
    chosen.length === 0 && t('packages'),
    chosen.some((name) => repeatedRows(packages[name].rows, itemOf).length > 0) &&
      t('sameItemTwice'),
    ...chosen
      .filter((name) => !packages[name].rows.some((row) => row.variantId))
      .map((name) => t('needItem', { tier: t(`tier.${name}`) })),
  ].filter((label): label is string => Boolean(label));
  const ready = missing.length === 0;

  const save = useMutation({
    mutationFn: () => {
      const shared = { pujaId, nameNe, nameEn, nameRomanized, aliases, description, images };
      return saved
        ? updateSet(kitSetKey(saved), existing!, shared, packages)
        : createSet(codeOf(nameEn), shared, packages);
    },
    onSuccess: async () => {
      toast.success(t('saved'));
      await queryClient.invalidateQueries({ queryKey: ['kits'] });
      router.push(routes.kits());
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  const guard = useUnsavedGuard(
    !save.isSuccess &&
      !existing &&
      (pujaId !== '' ||
        nameNe.trim() !== '' ||
        nameEn.trim() !== '' ||
        aliases !== '' ||
        nameRomanized !== '' ||
        description.trim() !== ''),
  );

  return (
    <div className="grid max-w-5xl gap-6">
      {guard}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => (next ? undefined : setRemoving(null))}
        title={t('removeTitle')}
        description={t('removeNote')}
        confirmLabel={t('remove')}
        onConfirm={() => {
          if (removing !== null) dropRow(removing);
          setRemoving(null);
        }}
      />
      <ConfirmDialog
        open={copying !== null}
        onOpenChange={(next) => (next ? undefined : setCopying(null))}
        title={t('copyWarnTitle', { tier: copying ? t(`tier.${copying}`) : '' })}
        description={t('copyWarnNote', { tier: t(`tier.${tier}`) })}
        confirmLabel={t('copyReplace')}
        onConfirm={() => copying && copyFrom(copying)}
      />
      <div>
        <Link href={routes.kits()} className="text-sm text-muted-foreground hover:text-foreground">
          ← {t('back')}
        </Link>
        <h1 className="mt-1 font-heading text-2xl font-semibold">
          {saved ? t('editTitle', { name: saved.nameNe }) : t('title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{saved ? t('editNote') : t('note')}</p>
      </div>

      <section className="grid gap-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-base font-semibold">{t('kit')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('puja')} htmlFor="kit-puja" help={t('pujaHelp')}>
            <SearchSelect
              id="kit-puja"
              source={choices.pujas}
              value={pujaId}
              onChange={(value) => {
                setPujaId(String(value));
                void fillFromPuja(String(value));
              }}
            />
          </Field>
          <Field label={t('nameNe')} htmlFor="kit-ne">
            <Input
              id="kit-ne"
              value={nameNe}
              placeholder="छठ पूजा किट"
              onChange={(e) => setNameNe(e.target.value)}
            />
          </Field>
          <Field label={t('nameEn')} htmlFor="kit-en">
            <Input
              id="kit-en"
              value={nameEn}
              placeholder="Chhath Puja Kit"
              onChange={(e) => setNameEn(e.target.value)}
            />
          </Field>
        </div>
        <Field label={t('nameRomanized')} htmlFor="kit-roman" help={t('nameRomanizedHelp')}>
          <Input
            id="kit-roman"
            value={nameRomanized}
            maxLength={160}
            placeholder="Chhath Puja Kit"
            onChange={(e) => setNameRomanized(e.target.value)}
          />
        </Field>
        <Field label={t('aliases')} htmlFor="kit-aliases" help={t('aliasesHelp')}>
          <ChipInput id="kit-aliases" value={aliases} onChange={setAliases} />
        </Field>
        <Field label={t('description')} htmlFor="kit-desc" help={t('descriptionHelp')}>
          <Input
            id="kit-desc"
            value={description}
            maxLength={500}
            placeholder="लक्ष्मी पूजाका लागि चाहिने सबै सामान एकैठाउँमा।"
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label={t('photos')} htmlFor="kit-photos" help={t('photosHelp')}>
          <ImagesInput id="kit-photos" value={images} current={() => images} onChange={setImages} />
        </Field>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-5 py-3.5">
          <h2 className="font-heading text-base font-semibold">{t('packages')}</h2>
          <p className="text-sm text-muted-foreground">{t('packagesNote')}</p>
        </header>
        <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
          {TIERS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTier(name)}
              aria-pressed={tier === name}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium',
                tier === name
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'grid size-5 place-items-center rounded-full text-[0.7rem]',
                  packages[name].on ? 'bg-success text-white' : 'bg-muted',
                )}
              >
                {packages[name].on ? '✓' : '–'}
              </span>
              {t(`tier.${name}`)}
            </button>
          ))}
        </div>

        <div className="grid gap-5 p-5">
          <label className="inline-flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={pkg.on}
              onChange={(e) => change({ on: e.target.checked })}
              className="size-4"
            />
            {t('offer', { tier: t(`tier.${tier}`) })}
          </label>
          {existing?.some((k) => k.tier === tier) && !pkg.on ? (
            <p role="alert" className="text-sm text-destructive">
              {t('removesOnSave', { tier: t(`tier.${tier}`) })}
            </p>
          ) : null}

          {pkg.on ? (
            <>
              {copySources.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {copySources.map((from) => (
                    <Button
                      key={from}
                      variant="secondary"
                      size="sm"
                      onClick={() => (hasChosen ? setCopying(from) : copyFrom(from))}
                    >
                      {t('copyFrom', { tier: t(`tier.${from}`) })}
                    </Button>
                  ))}
                </div>
              ) : null}
              <Field label={t('pullFrom')} htmlFor="pull-kit" help={t('pullFromHelp')}>
                <SearchSelect
                  id="pull-kit"
                  source={choices.kitPackages}
                  exclude={existing?.filter((k) => k.tier === tier).map((k) => k.id)}
                  value=""
                  disabled={pulling}
                  onChange={(value) => void pullFrom(String(value))}
                />
                {(pulledFrom[tier] ?? []).map((line) => (
                  <p key={line} className="mt-1 text-xs text-muted-foreground">
                    ✓ {line}
                  </p>
                ))}
              </Field>
              {SECTIONS.map((section) => (
                <KitRowsTable
                  key={section}
                  section={section}
                  source={sourceFor(section)}
                  pkg={pkg}
                  change={change}
                  changeRow={changeRow}
                  dropRow={dropRow}
                  setRemoving={setRemoving}
                  priceOf={priceOf}
                  costOf={costOf}
                  itemOf={itemOf}
                  repeated={repeated}
                  lineTotal={lineTotal}
                  afterOf={afterOf}
                />
              ))}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('discount')} htmlFor="pkg-discount" help={t('discountHelp')}>
                  <div className="flex gap-2">
                    <SearchSelect
                      aria-label={t('discountKind')}
                      required
                      className="w-24"
                      value={pkg.discountKind}
                      options={[
                        { value: 'PERCENT', label: '%' },
                        { value: 'FLAT', label: 'Rs' },
                      ]}
                      onChange={(value) => change({ discountKind: value as Pkg['discountKind'] })}
                    />
                    <Input
                      id="pkg-discount"
                      inputMode="decimal"
                      value={pkg.discount}
                      placeholder="0"
                      onChange={(e) => change({ discount: e.target.value })}
                    />
                  </div>
                </Field>
                <div className="grid gap-1.5 rounded-md border border-border p-3 text-sm sm:col-span-2">
                  <h4 className="font-semibold">{t('calcTitle')}</h4>
                  <PriceLine label={t('itemsCompulsory')} value={itemsSum} />
                  {pkg.hawanOptional ? null : (
                    <PriceLine label={t('hawanCompulsory')} value={hawanSum} />
                  )}
                  <PriceLine label={t('beforeDiscount')} value={oldPrice} strong top />
                  <PriceLine
                    label={
                      pkg.discountKind === 'PERCENT'
                        ? t('discountPercentOf', {
                            percent: Math.min(off, 100),
                            amount: formatMoney(String(oldPrice), 'en'),
                          })
                        : t('discountFlat')
                    }
                    value={-taken}
                    note={t('discountScope')}
                  />
                  <PriceLine label={t('afterDiscount')} value={salePrice} strong top />
                  {optionalItemsSum + optionalHawanSum > 0 ? (
                    <>
                      <PriceLine
                        label={t('optionalItemsApart')}
                        value={optionalItemsSum}
                        muted
                        top
                      />
                      <PriceLine label={t('optionalHawanApart')} value={optionalHawanSum} muted />
                      <PriceLine
                        label={t('withAllOptional')}
                        value={salePrice + optionalItemsSum + optionalHawanSum}
                        muted
                      />
                    </>
                  ) : null}
                </div>
              </div>

              <Field
                label={t('tierPhotos', { tier: t(`tier.${tier}`) })}
                htmlFor="pkg-photos"
                help={t('tierPhotosHelp')}
              >
                <ImagesInput
                  id="pkg-photos"
                  value={pkg.images}
                  current={() => pkg.images}
                  onChange={(json) => change({ images: json })}
                />
              </Field>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('off')}</p>
          )}
        </div>
      </section>

      {existing ? (
        <KitOffersPanel kits={existing} kit={existing.find((k) => k.tier === tier) ?? saved!} />
      ) : null}

      <div className="flex items-center justify-between gap-3">
        {ready ? (
          <p className="text-sm text-muted-foreground">{t('summary', { count: chosen.length })}</p>
        ) : (
          <p className="text-sm text-destructive">
            {tf('stillNeeded', { fields: missing.join(', ') })}
          </p>
        )}
        <div className="flex gap-2">
          <Link
            href={routes.kits()}
            className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3.5 text-sm font-medium hover:bg-muted"
          >
            {tf('cancel')}
          </Link>
          <Button disabled={!ready || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? tf('saving') : t('save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
