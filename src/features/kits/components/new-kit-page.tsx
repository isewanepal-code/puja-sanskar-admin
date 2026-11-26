'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ChipInput, SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { Icon } from '@/components/icons';
import { ConfirmDialog, useToast } from '@/components/overlays';
import { ImagesInput } from '@/components/resource/image-inputs';
import { readImages } from '@/components/resource/form-values';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError, request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { choices } from '@/lib/choices';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useUnsavedGuard } from '@/lib/use-unsaved-guard';

const TIERS = ['BASIC', 'STANDARD', 'PREMIUM'] as const;
type Tier = (typeof TIERS)[number];
type Row = { variantId: string; quantity: string; optional: boolean };
type Pkg = {
  on: boolean;
  images: string;
  discountKind: 'PERCENT' | 'FLAT';
  discount: string;
  packed: boolean;
  rows: Row[];
};

const emptyRow = (): Row => ({ variantId: '', quantity: '1', optional: false });
const emptyPkg = (on: boolean): Pkg => ({
  on,
  images: '[]',
  discountKind: 'PERCENT',
  discount: '',
  packed: false,
  rows: [emptyRow()],
});

// "Chhath Puja Kit" → CHHATH_PUJA_KIT, short enough for each package to add its tier.
const codeOf = (nameEn: string) => {
  const code = nameEn
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 22)
    .replace(/_+$/, '');
  return /^[A-Z]/.test(code) ? code : `K_${code}`.slice(0, 22);
};

// A puja's kit in one page: its name once, then the Basic, Standard and Premium packages, each with
// its own photos, discount and items. One Save makes them all.
export function NewKitPage() {
  const t = useTranslations('kitPage');
  const tf = useTranslations('forms');
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [pujaId, setPujaId] = useState(useSearchParams().get('puja') ?? '');
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
    const rest = pkg.rows.filter((_, i) => i !== index);
    change({ rows: rest.length > 0 ? rest : [emptyRow()] });
  };
  const changeRow = (index: number, patch: Partial<Row>) =>
    change({ rows: pkg.rows.map((row, i) => (i === index ? { ...row, ...patch } : row)) });

  const pujaName =
    useQuery({
      queryKey: ['puja-name', pujaId],
      enabled: Boolean(pujaId),
      staleTime: 600_000,
      queryFn: () => request<{ nameNe: string }>('GET', `/admin/pujas/${pujaId}`),
    }).data?.nameNe ?? '';
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
        return { variantId, price: Number(found?.price ?? 0), cost: Number(found?.cost ?? 0) };
      },
    })),
  });
  const priceOf = (variantId: string) =>
    priced.find((q) => q.data?.variantId === variantId)?.data?.price ?? 0;
  const costOf = (variantId: string) =>
    priced.find((q) => q.data?.variantId === variantId)?.data?.cost ?? 0;
  const lineTotal = (row: Row) => priceOf(row.variantId) * (Number(row.quantity) || 0);
  // The kit costs what its included items cost; optional ones are priced on the side.
  const oldPrice = pkg.rows.filter((r) => !r.optional).reduce((sum, r) => sum + lineTotal(r), 0);
  const optionalPrice = pkg.rows
    .filter((r) => r.optional)
    .reduce((sum, r) => sum + lineTotal(r), 0);
  const off = Number(pkg.discount) || 0;
  const taken = pkg.discountKind === 'PERCENT' ? (oldPrice * Math.min(off, 100)) / 100 : off;
  const salePrice = Math.max(oldPrice - taken, 0);

  const chosen = TIERS.filter((name) => packages[name].on);
  // What still keeps Save off, named, so nobody has to guess.
  const missing = [
    !pujaId && t('puja'),
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
          pujaId,
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
                  isOptional: row.optional,
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
              required
              value={pujaId}
              onChange={(value) => setPujaId(String(value))}
            />
          </Field>
          <span />
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
                    onClick={() => change({ rows: packages.BASIC.rows.map((row) => ({ ...row })) })}
                  >
                    {t('copyBasic')}
                  </Button>
                </div>
              ) : null}
              {([false, true] as const).map((optional) => {
                const list = pkg.rows
                  .map((row, index) => ({ row, index }))
                  .filter(({ row }) => row.optional === optional);
                const sellSum = list.reduce((sum, { row }) => sum + lineTotal(row), 0);
                const costSum = list.reduce(
                  (sum, { row }) => sum + costOf(row.variantId) * (Number(row.quantity) || 0),
                  0,
                );
                return (
                  <div key={String(optional)} className="grid gap-2">
                    <h3 className="text-sm font-semibold">
                      {optional
                        ? t('optionalTitle')
                        : t('itemsTitle', { puja: pujaName || t('thisPuja') })}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {optional ? t('optionalNote') : t('itemsNote')}
                    </p>
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
                          <tr>
                            <th className="w-8 px-2 py-2 text-left font-semibold">#</th>
                            <th className="px-2 py-2 text-left font-semibold">{t('pack')}</th>
                            <th className="w-20 px-2 py-2 text-right font-semibold">
                              {t('quantity')}
                            </th>
                            <th className="w-24 px-2 py-2 text-right font-semibold">
                              {t('buyPrice')}
                            </th>
                            <th className="w-24 px-2 py-2 text-right font-semibold">
                              {t('sellPrice')}
                            </th>
                            <th className="w-28 px-2 py-2 text-right font-semibold">
                              {t('lineTotal')}
                            </th>
                            <th className="w-10" />
                          </tr>
                        </thead>
                        <tbody>
                          {list.length === 0 ? (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-3 py-4 text-center text-muted-foreground"
                              >
                                {t('noneYet')}
                              </td>
                            </tr>
                          ) : null}
                          {list.map(({ row, index }, at) => (
                            <tr key={index} className="border-t border-border">
                              <td className="px-2 text-muted-foreground tabular-nums">{at + 1}</td>
                              <td className="p-1.5">
                                <SearchSelect
                                  aria-label={t('pack')}
                                  source={choices.packs}
                                  required
                                  value={row.variantId}
                                  onChange={(value) =>
                                    changeRow(index, { variantId: String(value) })
                                  }
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  aria-label={t('quantity')}
                                  inputMode="decimal"
                                  className="text-right"
                                  value={row.quantity}
                                  onChange={(e) => changeRow(index, { quantity: e.target.value })}
                                />
                              </td>
                              <td className="px-2 text-right text-muted-foreground tabular-nums">
                                {row.variantId && costOf(row.variantId) > 0
                                  ? formatMoney(String(costOf(row.variantId)), 'en')
                                  : '—'}
                              </td>
                              <td className="px-2 text-right tabular-nums">
                                {row.variantId
                                  ? formatMoney(String(priceOf(row.variantId)), 'en')
                                  : '—'}
                              </td>
                              <td className="px-2 text-right font-medium tabular-nums">
                                {row.variantId ? formatMoney(String(lineTotal(row)), 'en') : '—'}
                              </td>
                              <td className="px-1 text-center">
                                <IconButton
                                  icon="trash"
                                  variant="danger"
                                  label={t('remove')}
                                  onClick={() =>
                                    row.variantId ? setRemoving(index) : dropRow(index)
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {list.length > 0 ? (
                          <tfoot className="border-t border-border bg-muted/30 text-sm font-semibold">
                            <tr>
                              <td colSpan={3} className="px-2 py-2 text-right">
                                {t('sectionTotal')}
                              </td>
                              <td className="px-2 text-right text-muted-foreground tabular-nums">
                                {costSum > 0 ? formatMoney(String(costSum), 'en') : '—'}
                              </td>
                              <td />
                              <td className="px-2 text-right tabular-nums">
                                {formatMoney(String(sellSum), 'en')}
                              </td>
                              <td />
                            </tr>
                          </tfoot>
                        ) : null}
                      </table>
                    </div>
                    <div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => change({ rows: [...pkg.rows, { ...emptyRow(), optional }] })}
                      >
                        <Icon name="plus" size={14} />
                        {optional ? t('addOptional') : t('addItem')}
                      </Button>
                    </div>
                  </div>
                );
              })}

              <div className="grid gap-1 rounded-md border border-border bg-muted/30 p-3 text-sm">
                <div className="flex justify-between">
                  <span>{t('itemsTotal')}</span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(String(oldPrice), 'en')}
                  </span>
                </div>
                {optionalPrice > 0 ? (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('optionalTotal')}</span>
                    <span className="tabular-nums">{formatMoney(String(optionalPrice), 'en')}</span>
                  </div>
                ) : null}
              </div>

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
                <div className="grid gap-1 rounded-md border border-border p-3 text-sm sm:col-span-2">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('oldPrice')}</span>
                    <span className={cn('tabular-nums', taken > 0 && 'line-through')}>
                      {formatMoney(String(oldPrice), 'en')}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>{t('salePrice')}</span>
                    <span className="tabular-nums">{formatMoney(String(salePrice), 'en')}</span>
                  </div>
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
