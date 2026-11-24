'use client';

import { useTranslations } from 'next-intl';
import { useRef, type ReactNode } from 'react';

import { ChipInput, SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { Icon, type IconName } from '@/components/icons';
import { uploadMedia } from '@/components/media-library/media-picker';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { categoryChoices } from '@/features/catalogue';
import { priceGroups } from '@/features/marketing';
import { choices } from '@/lib/choices';
import { cn } from '@/lib/utils';

export type SellBy = 'PIECE' | 'WEIGHT' | 'LENGTH' | 'VOLUME' | 'SIZE';

// The five ways the shop sells, as big buttons with an everyday example each.
const WAYS: Array<{ value: SellBy; icon: IconName }> = [
  { value: 'PIECE', icon: 'diya' },
  { value: 'WEIGHT', icon: 'grain' },
  { value: 'LENGTH', icon: 'cloth' },
  { value: 'VOLUME', icon: 'drop' },
  { value: 'SIZE', icon: 'grid' },
];

export type ItemValues = {
  nameEn: string;
  nameNe: string;
  sellBy: SellBy;
  categoryId: string;
  nameRomanized: string;
  aliases: string;
  purpose: string;
  alternative: string;
  shortDescription: string;
  description: string;
  brand: string;
  supplierId: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
};

export const emptyItem: ItemValues = {
  nameEn: '',
  nameNe: '',
  sellBy: 'PIECE',
  categoryId: '',
  nameRomanized: '',
  aliases: '',
  purpose: '',
  alternative: '',
  shortDescription: '',
  description: '',
  brand: '',
  supplierId: '',
  slug: '',
  metaTitle: '',
  metaDescription: '',
};

// A photo of the item: one picked just now (a file) or one it already has (a link), with its alt text.
export type Photo = {
  key: string;
  previewUrl: string;
  file?: File;
  url?: string;
  optionValueId?: string | null;
  alt: string;
};

let photoCount = 0;
export const photosFromFiles = (files: File[]): Photo[] =>
  files.map((file) => ({
    key: `new-${(photoCount += 1)}`,
    previewUrl: URL.createObjectURL(file),
    file,
    alt: '',
  }));

export const photosFromItem = (
  images: Array<{ url: string; altText: string | null; optionValueId: string | null }>,
): Photo[] =>
  images.map((image, index) => ({
    key: `saved-${index}-${image.url}`,
    previewUrl: image.url,
    url: image.url,
    optionValueId: image.optionValueId,
    alt: image.altText ?? '',
  }));

// New files go up first; what the item then holds is every photo in order, with its alt text.
export async function uploadPhotos(photos: Photo[]) {
  const images = [];
  for (const photo of photos) {
    const url = photo.file ? (await uploadMedia(photo.file)).url : photo.url!;
    images.push({
      url,
      altText: photo.alt.trim() || null,
      optionValueId: photo.optionValueId ?? null,
    });
  }
  return images;
}

// The words of the item as the API takes them. A new item leaves a blank out; a changed one sends
// null, so a cleared field is cleared.
export function itemBody(values: ItemValues, clearing: boolean) {
  const text = (value: string) => value.trim() || (clearing ? null : undefined);
  return {
    nameEn: values.nameEn.trim(),
    nameNe: values.nameNe.trim(),
    sellBy: values.sellBy,
    nameRomanized: text(values.nameRomanized),
    description: text(values.description),
    shortDescription: text(values.shortDescription),
    purpose: text(values.purpose),
    alternative: text(values.alternative),
    metaTitle: text(values.metaTitle),
    metaDescription: text(values.metaDescription),
    brand: text(values.brand),
    defaultSupplierId: values.supplierId || (clearing ? null : undefined),
    aliases: values.aliases
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean),
    ...(values.slug.trim() && { slug: values.slug.trim() }),
  };
}

type ItemFormProps = {
  mode: 'add' | 'edit';
  values: ItemValues;
  onChange: (patch: Partial<ItemValues>) => void;
  photos: Photo[];
  onPhotos: (next: (all: Photo[]) => Photo[]) => void;
  groupIds: string[];
  onGroups: (ids: string[]) => void;
  // Groups already chosen, so their names show before the list loads.
  knownGroups?: Array<{ value: string; label: string; detail?: string }>;
  errors?: Record<string, string>;
  // Add: a warning about items with the same name, above the names.
  above?: ReactNode;
  onAddBrand: () => void;
};

// One form for a new item and for changing one: the same four sections, in the same order, the
// same fields. Adding starts empty; changing starts filled.
export function ItemForm({
  mode,
  values,
  onChange,
  photos,
  onPhotos,
  groupIds,
  onGroups,
  knownGroups,
  errors = {},
  above,
  onAddBrand,
}: ItemFormProps) {
  const t = useTranslations('inventory.addItem');
  const fileInput = useRef<HTMLInputElement>(null);
  const id = (name: string) => `${mode}-${name}`;
  const section = 'grid gap-4 rounded-xl border border-border bg-card p-5';

  return (
    <>
      <section className={section}>
        <h2 className="font-heading text-base font-semibold">{t('whatTitle')}</h2>
        {above}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={`${t('nameNe')} *`}
            htmlFor={id('name-ne')}
            hint={t('nameNeHint')}
            error={errors.nameNe}
          >
            <Input
              id={id('name-ne')}
              value={values.nameNe}
              maxLength={160}
              placeholder={t('nameNePlaceholder')}
              onChange={(e) => onChange({ nameNe: e.target.value })}
              autoFocus={mode === 'add'}
            />
          </Field>
          <Field
            label={`${t('nameEn')} *`}
            htmlFor={id('name-en')}
            hint={t('nameEnHint')}
            error={errors.nameEn}
          >
            <Input
              id={id('name-en')}
              value={values.nameEn}
              maxLength={160}
              placeholder={t('nameEnPlaceholder')}
              onChange={(e) => onChange({ nameEn: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('nameRomanized')} htmlFor={id('roman')} hint={t('nameRomanizedHint')}>
            <Input
              id={id('roman')}
              value={values.nameRomanized}
              maxLength={160}
              placeholder="kapada"
              onChange={(e) => onChange({ nameRomanized: e.target.value })}
            />
          </Field>
          <Field label={t('aliases')} htmlFor={id('aliases')} hint={t('aliasesHint')}>
            <ChipInput
              id={id('aliases')}
              value={values.aliases}
              onChange={(value) => onChange({ aliases: value })}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('purpose')} htmlFor={id('purpose')} hint={t('purposeHint')}>
            <Input
              id={id('purpose')}
              value={values.purpose}
              maxLength={200}
              onChange={(e) => onChange({ purpose: e.target.value })}
            />
          </Field>
          <Field label={t('alternative')} htmlFor={id('alt')} hint={t('alternativeHint')}>
            <Input
              id={id('alt')}
              value={values.alternative}
              maxLength={200}
              onChange={(e) => onChange({ alternative: e.target.value })}
            />
          </Field>
        </div>
        <Field label={t('shortDescription')} htmlFor={id('short')} hint={t('shortDescriptionHint')}>
          <Input
            id={id('short')}
            value={values.shortDescription}
            maxLength={200}
            onChange={(e) => onChange({ shortDescription: e.target.value })}
          />
        </Field>
        <Field label={t('description')} htmlFor={id('desc')} hint={t('descriptionHint')}>
          <textarea
            id={id('desc')}
            value={values.description}
            maxLength={4000}
            rows={3}
            onChange={(e) => onChange({ description: e.target.value })}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </Field>

        <div className="grid gap-2">
          <div>
            <p className="text-sm font-medium">{t('photosTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('photosNote')}</p>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            {photos.map((photo, index) => (
              <div key={photo.key} className="grid w-36 gap-1.5">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt={photo.alt}
                    className="aspect-square w-full rounded-md border border-border object-cover"
                  />
                  {index === 0 ? (
                    <span className="absolute bottom-1 left-1 rounded bg-primary px-1 text-[0.65rem] text-primary-foreground">
                      {t('mainPhoto')}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    aria-label={t('removePhoto')}
                    onClick={() => onPhotos((all) => all.filter((p) => p.key !== photo.key))}
                    className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-card text-destructive shadow ring-1 ring-border"
                  >
                    <Icon name="x" size={12} />
                  </button>
                </div>
                <Input
                  value={photo.alt}
                  maxLength={200}
                  aria-label={t('photoAlt')}
                  placeholder={t('photoAltPlaceholder')}
                  className="h-8 text-xs"
                  onChange={(e) =>
                    onPhotos((all) =>
                      all.map((p) => (p.key === photo.key ? { ...p, alt: e.target.value } : p)),
                    )
                  }
                />
              </div>
            ))}
            {photos.length < 12 ? (
              <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}>
                <Icon name="plus" size={16} />
                {t('addPhotos')}
              </Button>
            ) : null}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []).filter((f) =>
                  f.type.startsWith('image/'),
                );
                onPhotos((all) => [...all, ...photosFromFiles(picked)].slice(0, 12));
                e.target.value = '';
              }}
            />
          </div>
          {photos.length > 0 ? (
            <p className="text-xs text-muted-foreground">{t('photoAltNote')}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('brand')} htmlFor={id('brand')}>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <SearchSelect
                  id={id('brand')}
                  source={choices.brands}
                  value={values.brand}
                  onChange={(value) => onChange({ brand: String(value) })}
                />
              </div>
              <IconButton icon="plus" label={t('newBrand')} onClick={onAddBrand} />
            </div>
          </Field>
          <Field label={t('supplier')} htmlFor={id('supplier')} hint={t('supplierHint')}>
            <SearchSelect
              id={id('supplier')}
              source={choices.suppliers}
              value={values.supplierId}
              onChange={(value) => onChange({ supplierId: String(value) })}
            />
          </Field>
        </div>
      </section>

      <section className={section}>
        <div>
          <h2 className="font-heading text-base font-semibold">{t('howTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('howNote')}</p>
        </div>
        <div role="radiogroup" aria-label={t('howTitle')} className="grid gap-2 sm:grid-cols-5">
          {WAYS.map((way) => {
            const chosen = values.sellBy === way.value;
            return (
              <button
                key={way.value}
                type="button"
                role="radio"
                aria-checked={chosen}
                onClick={() => onChange({ sellBy: way.value })}
                className={cn(
                  'grid justify-items-center gap-1 rounded-lg border p-3 text-center transition-colors',
                  chosen
                    ? 'border-primary bg-primary/8 text-primary'
                    : 'border-border hover:bg-muted',
                )}
              >
                <Icon name={way.icon} size={22} />
                <span className="text-sm font-semibold">{t(`way.${way.value}`)}</span>
                <span className="text-[0.7rem] leading-tight text-muted-foreground">
                  {t(`wayExample.${way.value}`)}
                </span>
              </button>
            );
          })}
        </div>
        <Field
          label={`${t('category')} *`}
          htmlFor={id('category')}
          hint={t('categoryHint')}
          error={errors.categoryId}
        >
          <SearchSelect
            id={id('category')}
            source={categoryChoices}
            value={values.categoryId}
            onChange={(value) => onChange({ categoryId: String(value) })}
          />
        </Field>
      </section>

      <section className="grid gap-3 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="font-heading text-base font-semibold">{t('groupsTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('groupsNote')}</p>
        </div>
        <SearchSelect
          multiple
          source={priceGroups}
          value={groupIds}
          known={knownGroups}
          placeholder={t('groupsNone')}
          aria-label={t('groupsTitle')}
          onChange={(value) => onGroups(value as string[])}
        />
      </section>

      <section className={section}>
        <div>
          <h2 className="font-heading text-base font-semibold">{t('seoTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('seoNote')}</p>
        </div>
        <Field label={t('slug')} htmlFor={id('slug')} hint={t('slugHint')} error={errors.slug}>
          <Input
            id={id('slug')}
            value={values.slug}
            maxLength={160}
            placeholder={mode === 'add' ? 'kapur-tablet' : undefined}
            onChange={(e) => onChange({ slug: e.target.value })}
          />
        </Field>
        <Field
          label={t('metaTitle')}
          htmlFor={id('meta-title')}
          hint={t('metaTitleHint')}
          error={errors.metaTitle}
        >
          <div className="grid gap-1">
            <Input
              id={id('meta-title')}
              value={values.metaTitle}
              maxLength={70}
              onChange={(e) => onChange({ metaTitle: e.target.value })}
            />
            <span className="text-right text-xs text-muted-foreground">
              {values.metaTitle.length}/70
            </span>
          </div>
        </Field>
        <Field
          label={t('metaDescription')}
          htmlFor={id('meta-desc')}
          hint={t('metaDescriptionHint')}
          error={errors.metaDescription}
        >
          <div className="grid gap-1">
            <textarea
              id={id('meta-desc')}
              value={values.metaDescription}
              maxLength={160}
              rows={2}
              onChange={(e) => onChange({ metaDescription: e.target.value })}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <span className="text-right text-xs text-muted-foreground">
              {values.metaDescription.length}/160
            </span>
          </div>
        </Field>
      </section>
    </>
  );
}
