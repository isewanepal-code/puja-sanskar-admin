'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ChipInput, SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { Icon, type IconName } from '@/components/icons';
import { useToast } from '@/components/overlays';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { categoryChoices } from '@/features/catalogue';
import { codeFrom, SimilarItems } from '@/features/products';
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
  const [more, setMore] = useState(false);
  const [sameNameOk, setSameNameOk] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<{ id: string; name: string } | null>(null);
  const change = (patch: Partial<typeof empty>) => setForm((f) => ({ ...f, ...patch }));
  // Anything typed or chosen counts, so leaving asks before it is lost.
  const dirty = (Object.keys(empty) as Array<keyof typeof empty>).some(
    (key) => String(form[key]).trim() !== String(empty[key]),
  );
  const guard = useUnsavedGuard(saved === null && dirty);

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
          ...(form.aliases.trim() && {
            aliases: form.aliases
              .split(',')
              .map((a) => a.trim())
              .filter(Boolean),
          }),
          ...(form.brand.trim() && { brand: form.brand.trim() }),
          ...(form.supplierId && { defaultSupplierId: form.supplierId }),
          ...(sameNameOk && { allowDuplicateName: true }),
        },
      });
    },
    onSuccess: async (item) => {
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
          <Link href={routes.buy(saved.id)} className={buttonVariants({ variant: 'primary' })}>
            <Icon name="truck" size={16} />
            {t('buyNow')}
          </Link>
          <Button
            variant="secondary"
            onClick={() => {
              setSaved(null);
              // The next item is most often the same kind: keep how it is sold and its category.
              setForm({ ...empty, sellBy: form.sellBy, categoryId: form.categoryId });
              setSameNameOk(false);
              setMore(false);
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
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="mt-0.5 size-4"
            checked={sameNameOk}
            onChange={(e) => setSameNameOk(e.target.checked)}
          />
          {t('sameNameOk')}
        </label>
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

      <section className="rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => setMore((m) => !m)}
          aria-expanded={more}
          className="flex w-full items-center justify-between px-5 py-3 text-left text-sm font-medium"
        >
          {t('moreTitle')}
          <Icon
            name="down"
            size={16}
            className={cn('transition-transform', more && 'rotate-180')}
          />
        </button>
        {more ? (
          <div className="grid gap-4 border-t border-border p-5 sm:grid-cols-2">
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
            <Field label={t('brand')} htmlFor="add-brand">
              <SearchSelect
                id="add-brand"
                source={choices.brands}
                value={form.brand}
                onChange={(value) => change({ brand: String(value) })}
              />
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
        ) : null}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={cn('text-sm', missing.length ? 'text-destructive' : 'text-muted-foreground')}>
          {missing.length ? tf('stillNeeded', { fields: missing.join(', ') }) : t('ready')}
        </p>
        <Button type="submit" disabled={missing.length > 0 || save.isPending}>
          {save.isPending ? tf('saving') : t('save')}
        </Button>
      </div>
    </form>
  );
}
