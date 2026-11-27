'use client';

import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ChipInput, SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { ConfirmDialog, useToast } from '@/components/overlays';
import { ImagesInput } from '@/components/resource/image-inputs';
import { readImages } from '@/components/resource/form-values';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError, request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { choices } from '@/lib/choices';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useUnsavedGuard } from '@/lib/use-unsaved-guard';

import {
  blankRows,
  codeOf,
  emptyPkg,
  OPEN_ROWS,
  SECTIONS,
  TIERS,
  type Pkg,
  type Row,
  type Tier,
} from './kit-package';
import { KitRowsTable } from './kit-rows-table';
import { PriceLine } from './kit-price-line';

// A puja's kit in one page: its name once, then the Basic, Standard and Premium packages, each with
// its own photos, discount and items. One Save makes them all.
export function NewKitPage() {
  const t = useTranslations('kitPage');
  const tf = useTranslations('forms');
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  // The puja this kit is for is optional: it only ties the kit to the puja (and fills the items).
  const [pujaId, setPujaId] = useState('');
  const [filling, setFilling] = useState(false);
  const [nameNe, setNameNe] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameRomanized, setNameRomanized] = useState('');
  const [aliases, setAliases] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState('[]');
  const [tier, setTier] = useState<Tier>('BASIC');
  const [packages, setPackages] = useState<Record<Tier, Pkg>>({
    BASIC: emptyPkg(true),
    STANDARD: emptyPkg(false),
    PREMIUM: emptyPkg(false),
  });
  const pkg = packages[tier];
  const change = (patch: Partial<Pkg>) =>
    setPackages((all) => ({ ...all, [tier]: { ...all[tier], ...patch } }));
  // A row waiting for the "really delete?" answer.
  const [removing, setRemoving] = useState<number | null>(null);
  const dropRow = (index: number) => {
    change({ rows: pkg.rows.filter((_, i) => i !== index) });
  };
  const changeRow = (index: number, patch: Partial<Row>) =>
    change({ rows: pkg.rows.map((row, i) => (i === index ? { ...row, ...patch } : row)) });

  // The puja's samagri as the kit's items, each ticked Optional as the puja lists it.
  const fillFromPuja = async (id: string, force: boolean) => {
    if (!id || (pkg.rows.some((row) => row.variantId) && !force)) return;
    setFilling(true);
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
    } finally {
      setFilling(false);
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
  const productOf = (variantId: string) =>
    priced.find((q) => q.data?.variantId === variantId)?.data?.productId ?? '';
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
    ...chosen
      .filter((name) => !packages[name].rows.some((row) => row.variantId))
      .map((name) => t('needItem', { tier: t(`tier.${name}`) })),
  ].filter((label): label is string => Boolean(label));
  const ready = missing.length === 0;

  const save = useMutation({
    mutationFn: () =>
      request('POST', '/admin/kits/packages', {
        body: {
          ...(pujaId && { pujaId }),
          code: codeOf(nameEn),
          nameEn: nameEn.trim(),
          nameNe: nameNe.trim(),
          ...(nameRomanized.trim() && { nameRomanized: nameRomanized.trim() }),
          aliases: aliases
            .split(',')
            .map((name) => name.trim())
            .filter(Boolean),
          description: description.trim() || null,
          images: readImages(images),
          packages: chosen.map((name) => {
            const p = packages[name];
            return {
              tier: name,
              images: readImages(p.images),
              discountKind: p.discountKind,
              ...(p.discount.trim() &&
                (p.discountKind === 'PERCENT'
                  ? { discountPercent: p.discount.trim() }
                  : { discountAmount: p.discount.trim() })),
              packed: p.packed,
              items: p.rows
                .filter((row) => row.variantId)
                .map((row) => ({
                  variantId: row.variantId,
                  quantity: Number(row.quantity) || 1,
                  isOptional: row.hawan ? p.hawanOptional : row.optional,
                  isHawan: row.hawan,
                })),
            };
          }),
        },
      }),
    onSuccess: async () => {
      toast.success(t('saved'));
      await queryClient.invalidateQueries({ queryKey: ['kits'] });
      router.push(routes.kits());
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  const guard = useUnsavedGuard(
    !save.isSuccess &&
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
      <div>
        <Link href={routes.kits()} className="text-sm text-muted-foreground hover:text-foreground">
          ← {t('back')}
        </Link>
        <h1 className="mt-1 font-heading text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('note')}</p>
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
                void fillFromPuja(String(value), false);
              }}
            />
          </Field>
          <div className="flex items-end">
            {pujaId ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={filling}
                onClick={() => void fillFromPuja(pujaId, true)}
              >
                {t('fillFromPuja')}
              </Button>
            ) : null}
          </div>
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

          {pkg.on ? (
            <>
              {tier !== 'BASIC' && packages.BASIC.rows.some((r) => r.variantId) ? (
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      change({
                        rows: packages.BASIC.rows.map((row) => ({ ...row })),
                        hawanOptional: packages.BASIC.hawanOptional,
                      })
                    }
                  >
                    {t('copyBasic')}
                  </Button>
                </div>
              ) : null}
              {SECTIONS.map((section) => (
                <KitRowsTable
                  key={section}
                  section={section}
                  pkg={pkg}
                  change={change}
                  changeRow={changeRow}
                  dropRow={dropRow}
                  setRemoving={setRemoving}
                  priceOf={priceOf}
                  costOf={costOf}
                  productOf={productOf}
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
                  <PriceLine label={t('hawanCompulsory')} value={hawanSum} />
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
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={pkg.packed}
                    onChange={(e) => change({ packed: e.target.checked })}
                    className="size-4"
                  />
                  {t('packed')}
                </label>
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
