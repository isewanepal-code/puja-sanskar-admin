'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { ChipInput, SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { Icon, type IconName } from '@/components/icons';
import { useToast } from '@/components/overlays';
import { CreateModal } from '@/components/resource';
import { Button, buttonVariants, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { brandsResource, categoryChoices } from '@/features/catalogue';
import { priceGroups } from '@/features/marketing';
import { codeFrom, SimilarItems } from '@/features/products';
import { uploadMedia } from '@/components/media-library/media-picker';
import { fieldErrors, isApiError, request } from '@/lib/api';
import { choices } from '@/lib/choices';
import { routes } from '@/lib/routes';
import { useUnsavedGuard } from '@/lib/use-unsaved-guard';
import { cn } from '@/lib/utils';

type SellBy = 'PIECE' | 'WEIGHT' | 'LENGTH' | 'VOLUME' | 'SIZE';

// The five ways the shop sells, as big buttons with an everyday example each.
const WAYS: Array<{ value: SellBy; icon: IconName }> = [
  { value: 'PIECE', icon: 'diya' },
  { value: 'WEIGHT', icon: 'grain' },
  { value: 'LENGTH', icon: 'cloth' },
  { value: 'VOLUME', icon: 'drop' },
  { value: 'SIZE', icon: 'grid' },
];

const empty = {
  nameEn: '',
  nameNe: '',
  sellBy: 'PIECE' as SellBy,
  categoryId: '',
  nameRomanized: '',
  description: '',
  aliases: '',
  brand: '',
  supplierId: '',
};

// Step 1 of the inventory: say what the item is, nothing more. No packs, no prices, no colours: the
// colour or size is chosen when it is bought (red cloth bought → red cloth in stock → red pieces sold),
// and the selling price after that.
export function AddItemPage() {
  const t = useTranslations('inventory.addItem');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(empty);
  const [photos, setPhotos] = useState<File[]>([]);
  const [addingBrand, setAddingBrand] = useState(false);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<{ id: string; name: string } | null>(null);
  const change = (patch: Partial<typeof empty>) => setForm((f) => ({ ...f, ...patch }));
  // Anything typed or chosen counts, so leaving asks before it is lost.
  const dirty = (Object.keys(empty) as Array<keyof typeof empty>).some(
    (key) => String(form[key]).trim() !== String(empty[key]),
  );
  const guard = useUnsavedGuard(
    saved === null && (dirty || photos.length > 0 || groupIds.length > 0),
  );

  const save = useMutation({
    mutationFn: () => {
      const nameEn = form.nameEn.trim();
      const nameNe = form.nameNe.trim();
      return request<{ id: string; nameEn: string }>('POST', '/admin/items', {
        body: {
          code: codeFrom(nameEn),
          nameEn,
          nameNe,
          sellBy: form.sellBy,
          categoryId: form.categoryId,
          ...(form.nameRomanized.trim() && { nameRomanized: form.nameRomanized.trim() }),
          ...(form.description.trim() && { description: form.description.trim() }),
          ...(form.aliases.trim() && {
            aliases: form.aliases
              .split(',')
              .map((a) => a.trim())
              .filter(Boolean),
          }),
          ...(form.brand.trim() && { brand: form.brand.trim() }),
          ...(form.supplierId && { defaultSupplierId: form.supplierId }),
        },
      });
    },
    onSuccess: async (item) => {
      // Photos and groups go on the item once it exists; one failing does not undo the item.
      try {
        if (photos.length > 0) {
          const images = [];
          for (const file of photos) {
            const { url } = await uploadMedia(file);
            images.push({ url, altText: null, optionValueId: null });
          }
          await request('PATCH', `/admin/products/${item.id}`, { body: { images } });
        }
        if (groupIds.length > 0) {
          await request('PUT', `/admin/price-groups/of/product/${item.id}`, { body: { groupIds } });
        }
      } catch (error) {
        toast.error(isApiError(error) ? error.message : tf('failed'));
      }
      setSaved({ id: item.id, name: item.nameEn });
      setErrors({});
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      setErrors(fieldErrors(error));
      toast.error(isApiError(error) ? error.message : tf('failed'));
    },
  });

  const missing = [
    !form.nameNe.trim() && t('nameNe'),
    !form.nameEn.trim() && t('nameEn'),
    !form.categoryId && t('category'),
  ].filter(Boolean);

  if (saved) {
    return (
      <section className="grid max-w-2xl gap-4 rounded-xl border border-success/40 bg-success/5 p-6">
        <p className="flex items-center gap-2 text-lg font-semibold">
          <Icon name="check" size={20} className="text-success" />
          {t('savedTitle', { name: saved.name })}
        </p>
        <p className="text-sm text-muted-foreground">{t('savedNext')}</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={routes.quantityPrice(saved.id)}
            className={buttonVariants({ variant: 'primary' })}
          >
            <Icon name="tag" size={16} />
            {t('setQuantityPrice')}
          </Link>
          <Button
            variant="secondary"
            onClick={() => {
              setSaved(null);
              // The next item is most often the same kind: keep how it is sold and its category.
              setForm({ ...empty, sellBy: form.sellBy, categoryId: form.categoryId });
              setPhotos([]);
              setGroupIds([]);
            }}
          >
            <Icon name="plus" size={16} />
            {t('addAnother')}
          </Button>
          <Link href={routes.item(saved.id)} className={buttonVariants({ variant: 'ghost' })}>
            {t('openItem')}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <form
        className="grid max-w-3xl gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (missing.length === 0) save.mutate();
        }}
      >
        {guard}

        <section className="grid gap-4 rounded-xl border border-border bg-card p-5">
          <h2 className="font-heading text-base font-semibold">{t('whatTitle')}</h2>
          <SimilarItems nameEn={form.nameEn} nameNe={form.nameNe} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={`${t('nameEn')} *`}
              htmlFor="add-name-en"
              hint={t('nameEnHint')}
              error={errors.nameEn}
            >
              <Input
                id="add-name-en"
                value={form.nameEn}
                maxLength={160}
                placeholder={t('nameEnPlaceholder')}
                onChange={(e) => change({ nameEn: e.target.value })}
                autoFocus
              />
            </Field>
            <Field
              label={`${t('nameNe')} *`}
              htmlFor="add-name-ne"
              hint={t('nameNeHint')}
              error={errors.nameNe}
            >
              <Input
                id="add-name-ne"
                value={form.nameNe}
                maxLength={160}
                placeholder={t('nameNePlaceholder')}
                onChange={(e) => change({ nameNe: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('nameRomanized')} htmlFor="add-roman" hint={t('nameRomanizedHint')}>
              <Input
                id="add-roman"
                value={form.nameRomanized}
                maxLength={160}
                placeholder="kapada"
                onChange={(e) => change({ nameRomanized: e.target.value })}
              />
            </Field>
            <Field label={t('aliases')} htmlFor="add-aliases" hint={t('aliasesHint')}>
              <ChipInput
                id="add-aliases"
                value={form.aliases}
                onChange={(value) => change({ aliases: value })}
              />
            </Field>
          </div>
          <Field label={t('description')} htmlFor="add-desc" hint={t('descriptionHint')}>
            <textarea
              id="add-desc"
              value={form.description}
              maxLength={4000}
              rows={3}
              onChange={(e) => change({ description: e.target.value })}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <div className="grid gap-2">
            <div>
              <p className="text-sm font-medium">{t('photosTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('photosNote')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {photos.map((file, index) => (
                <div key={`${file.name}-${index}`} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="size-20 rounded-md border border-border object-cover"
                  />
                  {index === 0 ? (
                    <span className="absolute bottom-1 left-1 rounded bg-primary px-1 text-[0.65rem] text-primary-foreground">
                      {t('mainPhoto')}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    aria-label={t('removePhoto')}
                    onClick={() => setPhotos((all) => all.filter((_, i) => i !== index))}
                    className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-card text-destructive shadow ring-1 ring-border"
                  >
                    <Icon name="x" size={12} />
                  </button>
                </div>
              ))}
              {photos.length < 12 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInput.current?.click()}
                >
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
                  setPhotos((all) => [...all, ...picked].slice(0, 12));
                  e.target.value = '';
                }}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('brand')} htmlFor="add-brand">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <SearchSelect
                    id="add-brand"
                    source={choices.brands}
                    value={form.brand}
                    onChange={(value) => change({ brand: String(value) })}
                  />
                </div>
                <IconButton
                  icon="plus"
                  label={t('newBrand')}
                  onClick={() => setAddingBrand(true)}
                />
              </div>
            </Field>
            <Field label={t('supplier')} htmlFor="add-supplier" hint={t('supplierHint')}>
              <SearchSelect
                id="add-supplier"
                source={choices.suppliers}
                value={form.supplierId}
                onChange={(value) => change({ supplierId: String(value) })}
              />
            </Field>
          </div>
        </section>

        <section className="grid gap-4 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="font-heading text-base font-semibold">{t('howTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t('howNote')}</p>
          </div>
          <div role="radiogroup" aria-label={t('howTitle')} className="grid gap-2 sm:grid-cols-5">
            {WAYS.map((way) => {
              const chosen = form.sellBy === way.value;
              return (
                <button
                  key={way.value}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  onClick={() => change({ sellBy: way.value })}
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
            htmlFor="add-category"
            hint={t('categoryHint')}
            error={errors.categoryId}
          >
            <SearchSelect
              id="add-category"
              source={categoryChoices}
              value={form.categoryId}
              onChange={(value) => change({ categoryId: String(value) })}
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
            placeholder={t('groupsNone')}
            aria-label={t('groupsTitle')}
            onChange={(value) => setGroupIds(value as string[])}
          />
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            className={cn('text-sm', missing.length ? 'text-destructive' : 'text-muted-foreground')}
          >
            {missing.length ? tf('stillNeeded', { fields: missing.join(', ') }) : t('ready')}
          </p>
          <Button type="submit" disabled={missing.length > 0 || save.isPending}>
            {save.isPending ? tf('saving') : t('save')}
          </Button>
        </div>
      </form>
      {/* Outside the form: its own Save must not send the item. */}
      <CreateModal
        resource={brandsResource}
        open={addingBrand}
        onOpenChange={setAddingBrand}
        onCreated={(brand) => {
          change({ brand: brand.name });
          toast.success(t('brandAdded', { name: brand.name }));
        }}
      />
    </>
  );
}
