'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useToast } from '@/components/overlays';
import { CreateModal } from '@/components/resource';
import { Button, buttonVariants } from '@/components/ui/button';
import { brandsResource } from '@/features/catalogue';
import {
  codeFrom,
  emptyItem,
  ItemForm,
  itemBody,
  SimilarItems,
  uploadPhotos,
  type ItemValues,
  type Photo,
} from '@/features/products';
import { Icon } from '@/components/icons';
import { fieldErrors, isApiError, request } from '@/lib/api';
import { routes } from '@/lib/routes';
import { useDraft } from '@/lib/use-draft';
import { useUnsavedGuard } from '@/lib/use-unsaved-guard';
import { cn } from '@/lib/utils';

// Step 1 of the inventory: say what the item is, nothing more. No packs, no prices, no colours: the
// colour or size is chosen when it is bought (red cloth bought → red cloth in stock → red pieces sold),
// and the selling price after that. Whether a pack shows on the website is set with its price.
export function AddItemPage() {
  const t = useTranslations('inventory.addItem');
  const tf = useTranslations('forms');
  const tc = useTranslations('common');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ItemValues>(emptyItem);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [addingBrand, setAddingBrand] = useState(false);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<{ id: string; name: string } | null>(null);
  const change = (patch: Partial<ItemValues>) => setForm((f) => ({ ...f, ...patch }));
  // Anything typed or chosen counts, so leaving asks before it is lost.
  const dirty = (Object.keys(emptyItem) as Array<keyof ItemValues>).some(
    (key) => String(form[key]).trim() !== String(emptyItem[key]),
  );
  const holding = dirty || groupIds.length > 0;
  // What is typed is kept as a draft in this browser (photos are not), so a slip costs nothing.
  const draft = useDraft<{ form: ItemValues; groupIds: string[] }>(
    saved === null ? 'add-item' : null,
    { form, groupIds },
    holding,
  );
  const guard = useUnsavedGuard(saved === null && (holding || photos.length > 0), {
    onSaveDraft: draft.saveNow,
    onDiscard: draft.clear,
  });

  const save = useMutation({
    mutationFn: () => {
      const body = itemBody(form, false);
      return request<{ id: string; nameEn: string }>('POST', '/admin/items', {
        body: { ...body, code: codeFrom(body.nameEn), categoryId: form.categoryId },
      });
    },
    onSuccess: async (item) => {
      // Photos and groups go on the item once it exists; one failing does not undo the item.
      try {
        if (photos.length > 0) {
          await request('PATCH', `/admin/products/${item.id}`, {
            body: { images: await uploadPhotos(photos) },
          });
        }
        if (groupIds.length > 0) {
          await request('PUT', `/admin/price-groups/of/product/${item.id}`, { body: { groupIds } });
        }
      } catch (error) {
        toast.error(isApiError(error) ? error.message : tf('failed'));
      }
      draft.clear();
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
              draft.clear();
              // The next item is most often the same kind: keep how it is sold and its category.
              setForm({ ...emptyItem, sellBy: form.sellBy, categoryId: form.categoryId });
              setPhotos([]);
              setGroupIds([]);
            }}
          >
            <Icon name="plus" size={16} />
            {t('addAnother')}
          </Button>
          <Link href={routes.buy(saved.id)} className={buttonVariants({ variant: 'secondary' })}>
            <Icon name="truck" size={16} />
            {t('buyIt')}
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
        {draft.found && !holding ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm">
              {tc('draftFound', { time: new Date(draft.found.savedAt).toLocaleString() })}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  setForm({ ...emptyItem, ...draft.found!.value.form });
                  setGroupIds(draft.found!.value.groupIds);
                  draft.dismiss();
                }}
              >
                {tc('draftContinue')}
              </Button>
              <Button type="button" variant="secondary" onClick={draft.clear}>
                {tc('draftDiscard')}
              </Button>
            </div>
          </div>
        ) : null}
        <ItemForm
          mode="add"
          values={form}
          onChange={change}
          photos={photos}
          onPhotos={setPhotos}
          groupIds={groupIds}
          onGroups={setGroupIds}
          errors={errors}
          above={<SimilarItems nameEn={form.nameEn} nameNe={form.nameNe} />}
          onAddBrand={() => setAddingBrand(true)}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            className={cn('text-sm', missing.length ? 'text-destructive' : 'text-muted-foreground')}
          >
            {missing.length ? tf('stillNeeded', { fields: missing.join(', ') }) : t('ready')}
          </p>
          <div className="flex items-center gap-2">
            {draft.lastSaved ? (
              <span className="text-xs text-muted-foreground">{tc('draftAutosaved')}</span>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              disabled={!holding}
              onClick={() => {
                draft.saveNow();
                toast.success(tc('draftSaved'));
              }}
            >
              {tc('saveDraft')}
            </Button>
            <Button type="submit" disabled={missing.length > 0 || save.isPending}>
              {save.isPending ? tf('saving') : t('save')}
            </Button>
          </div>
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
