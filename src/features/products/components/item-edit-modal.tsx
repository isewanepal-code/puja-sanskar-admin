'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { useToast } from '@/components/overlays';
import { CreateModal } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { brandsResource } from '@/features/catalogue';
import { fieldErrors, isApiError, request, type Schema } from '@/lib/api';

import {
  ItemForm,
  itemBody,
  photosFromItem,
  uploadPhotos,
  type ItemValues,
  type Photo,
} from './item-form';
import { useProduct, type Product } from './use-product';

type Groups = Schema<'ItemGroupsResponse'>;

const valuesOf = (product: Product): ItemValues => ({
  nameEn: product.nameEn,
  nameNe: product.nameNe,
  sellBy: product.sellBy,
  categoryId: '',
  materialId: product.material.id,
  nameRomanized: product.nameRomanized ?? '',
  aliases: product.aliases.join(', '),
  purpose: product.purpose ?? '',
  alternative: product.alternative ?? '',
  shortDescription: product.shortDescription ?? '',
  description: product.description ?? '',
  brand: product.brand ?? '',
  supplierId: product.defaultSupplierId ?? '',
  slug: product.slug,
  metaTitle: product.metaTitle ?? '',
  metaDescription: product.metaDescription ?? '',
});

// Changing an item: the same form as adding one, filled with what the item has now.
export function ItemEditModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const t = useTranslations('inventory.addItem');
  const product = useProduct(id ?? undefined);
  const groups = useQuery({
    queryKey: ['priceGroups', 'of', 'product', id],
    queryFn: () => request<Groups>('GET', `/admin/price-groups/of/product/${id}`),
    enabled: id !== null,
  });
  const ready = product.data && groups.data;

  return (
    <Modal
      open={id !== null}
      onOpenChange={(open) => (open ? undefined : onClose())}
      size="lg"
      title={t('editTitle')}
      description={product.data ? `${product.data.nameNe} · ${product.data.code}` : undefined}
    >
      {ready ? (
        <EditBody
          key={`${product.data.id}:${product.data.updatedAt}`}
          product={product.data}
          groups={groups.data.groups}
          onClose={onClose}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{product.isError ? t('notLoaded') : '…'}</p>
      )}
    </Modal>
  );
}

// The same form on the item's own page, filled and saved in place.
export function ItemEditPanel({ id }: { id: string }) {
  const product = useProduct(id);
  const groups = useQuery({
    queryKey: ['priceGroups', 'of', 'product', id],
    queryFn: () => request<Groups>('GET', `/admin/price-groups/of/product/${id}`),
  });
  if (!product.data || !groups.data) return <p className="text-sm text-muted-foreground">…</p>;
  return (
    <EditBody
      key={`${product.data.id}:${product.data.updatedAt}`}
      product={product.data}
      groups={groups.data.groups}
      onClose={() => undefined}
    />
  );
}

function EditBody({
  product,
  groups,
  onClose,
}: {
  product: Product;
  groups: Groups['groups'];
  onClose: () => void;
}) {
  const t = useTranslations('inventory.addItem');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const formId = useId();
  const [form, setForm] = useState<ItemValues>(() => valuesOf(product));
  const [photos, setPhotos] = useState<Photo[]>(() => photosFromItem(product.images));
  const [groupIds, setGroupIds] = useState<string[]>(() => groups.map((g) => g.id));
  const [addingBrand, setAddingBrand] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const change = (patch: Partial<ItemValues>) => setForm((f) => ({ ...f, ...patch }));

  const save = useMutation({
    mutationFn: async () => {
      await request('PATCH', `/admin/products/${product.id}`, {
        body: {
          ...itemBody(form, true),
          ...(form.materialId && form.materialId !== product.material.id
            ? { materialId: form.materialId }
            : {}),
          images: await uploadPhotos(photos),
        },
      });
      const before = groups
        .map((g) => g.id)
        .sort()
        .join();
      if (before !== [...groupIds].sort().join()) {
        await request('PUT', `/admin/price-groups/of/product/${product.id}`, {
          body: { groupIds },
        });
      }
    },
    onSuccess: async () => {
      toast.success(t('editSaved'));
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['priceGroups'] });
      onClose();
    },
    onError: (error) => {
      setErrors(fieldErrors(error));
      toast.error(isApiError(error) ? error.message : tf('failed'));
    },
  });

  const missing = [!form.nameNe.trim() && t('nameNe'), !form.nameEn.trim() && t('nameEn')].filter(
    Boolean,
  );

  return (
    <>
      <form
        id={formId}
        className="grid gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (missing.length === 0) save.mutate();
        }}
      >
        <ItemForm
          mode="edit"
          values={form}
          onChange={change}
          photos={photos}
          onPhotos={setPhotos}
          groupIds={groupIds}
          onGroups={setGroupIds}
          knownGroups={groups.map((g) => ({ value: g.id, label: g.name, detail: g.code }))}
          errors={errors}
          samagri={{
            value: product.material.id,
            label: `${product.material.nameNe} · ${product.material.nameEn}`,
          }}
          onAddBrand={() => setAddingBrand(true)}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {missing.length ? tf('stillNeeded', { fields: missing.join(', ') }) : t('editNote')}
          </p>
          <Button type="submit" disabled={missing.length > 0 || save.isPending}>
            {save.isPending ? tf('saving') : t('editSave')}
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
