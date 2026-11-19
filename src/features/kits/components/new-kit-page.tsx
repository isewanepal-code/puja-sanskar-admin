'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ChipInput, SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { Icon } from '@/components/icons';
import { useToast } from '@/components/overlays';
import { ImagesInput } from '@/components/resource/image-inputs';
import { readImages } from '@/components/resource/form-values';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError, request } from '@/lib/api';
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
  const [pujaId, setPujaId] = useState('');
  const [nameNe, setNameNe] = useState('');
  const [nameEn, setNameEn] = useState('');
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
  const changeRow = (index: number, patch: Partial<Row>) =>
    change({ rows: pkg.rows.map((row, i) => (i === index ? { ...row, ...patch } : row)) });

  const chosen = TIERS.filter((name) => packages[name].on);
  const ready =
    pujaId &&
    nameNe.trim() &&
    nameEn.trim() &&
    chosen.length > 0 &&
    chosen.every((name) => packages[name].rows.some((row) => row.variantId));

  const save = useMutation({
    mutationFn: () =>
      request('POST', '/admin/kits/packages', {
        body: {
          pujaId,
          code: codeOf(nameEn),
          nameEn: nameEn.trim(),
          nameNe: nameNe.trim(),
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
        description.trim() !== ''),
  );

  return (
    <div className="grid max-w-5xl gap-6">
      {guard}
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
        <Field label={t('aliases')} htmlFor="kit-aliases" help={t('aliasesHelp')}>
          <ChipInput id="kit-aliases" value={aliases} onChange={setAliases} />
        </Field>
        <Field label={t('description')} htmlFor="kit-desc" help={t('descriptionHelp')}>
          <Input
            id="kit-desc"
            value={description}
            maxLength={500}
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
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{t('items')}</h3>
                  {tier !== 'BASIC' && packages.BASIC.rows.some((r) => r.variantId) ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        change({ rows: packages.BASIC.rows.map((row) => ({ ...row })) })
                      }
                    >
                      {t('copyBasic')}
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{t('itemsNote')}</p>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
                      <tr>
                        <th className="px-2 py-2 text-left font-semibold">{t('pack')}</th>
                        <th className="w-24 px-2 py-2 text-right font-semibold">{t('quantity')}</th>
                        <th className="w-28 px-2 py-2 text-center font-semibold">
                          {t('optional')}
                        </th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {pkg.rows.map((row, index) => (
                        <tr key={index} className="border-t border-border">
                          <td className="p-1.5">
                            <SearchSelect
                              aria-label={t('pack')}
                              source={choices.packs}
                              required
                              value={row.variantId}
                              onChange={(value) => changeRow(index, { variantId: String(value) })}
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
                          <td className="text-center">
                            <input
                              type="checkbox"
                              aria-label={t('optional')}
                              checked={row.optional}
                              onChange={(e) => changeRow(index, { optional: e.target.checked })}
                              className="size-4"
                            />
                          </td>
                          <td className="px-1 text-center">
                            <IconButton
                              icon="trash"
                              variant="danger"
                              label={t('remove')}
                              disabled={pkg.rows.length === 1}
                              onClick={() =>
                                change({ rows: pkg.rows.filter((_, i) => i !== index) })
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => change({ rows: [...pkg.rows, emptyRow()] })}
                  >
                    <Icon name="plus" size={14} />
                    {t('addItem')}
                  </Button>
                </div>
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
                <label className="mt-6 inline-flex items-center gap-2 text-sm">
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
        <p className="text-sm text-muted-foreground">{t('summary', { count: chosen.length })}</p>
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
