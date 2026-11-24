'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { useToast } from '@/components/overlays';
import { CreateModal } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { brandsResource } from '@/features/catalogue';
import { fieldErrors, isApiError, request, type Schema } from '@/lib/api';
import { routes } from '@/lib/routes';

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

const valuesOf = (product: Product, category: string): ItemValues => ({
  nameEn: product.nameEn,
  nameNe: product.nameNe,
  sellBy: product.sellBy,
  categoryId: category,
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

// What the edit form starts from: the item, its groups, and the category its samagri sits in.
function useEditData(id: string | null) {
  const product = useProduct(id ?? undefined);
  const groups = useQuery({
    queryKey: ['priceGroups', 'of', 'product', id],
    queryFn: () => request<Groups>('GET', `/admin/price-groups/of/product/${id}`),
    enabled: id !== null,
  });
  const materialId = product.data?.material.id;
  const material = useQuery({
    queryKey: ['materials', 'one', materialId],
    queryFn: () =>
      request<Schema<'AdminMaterialResponse'>>('GET', `/admin/materials/${materialId}`),
    enabled: Boolean(materialId),
  });
  return {
    product,
    ready:
      product.data && groups.data && material.data
        ? { product: product.data, groups: groups.data.groups, category: material.data.category.id }
        : null,
  };
}

// Changing an item: the same form as adding one, filled with what the item has now.
export function ItemEditModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const t = useTranslations('inventory.addItem');
  const { product, ready } = useEditData(id);

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
          key={`${ready.product.id}:${ready.product.updatedAt}`}
          {...ready}
          onClose={onClose}
          withMore
        />
      ) : (
        <p className="text-sm text-muted-foreground">{product.isError ? t('notLoaded') : '…'}</p>
      )}
    </Modal>
  );
}

// The same form on the item's own page, filled and saved in place.
export function ItemEditPanel({ id }: { id: string }) {
  const { ready } = useEditData(id);
  if (!ready) return <p className="text-sm text-muted-foreground">…</p>;
  return (
    <EditBody
      key={`${ready.product.id}:${ready.product.updatedAt}`}
      {...ready}
      onClose={() => undefined}
    />
  );
}

function EditBody({
  product,
  groups,
  category,
  onClose,
  withMore = false,
}: {
  product: Product;
  groups: Groups['groups'];
  category: string;
  onClose: () => void;
  // In the modal: a link to the item's page for colours, quality, goes-with and offers.
  withMore?: boolean;
}) {
  const t = useTranslations('inventory.addItem');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const formId = useId();
  const [form, setForm] = useState<ItemValues>(() => valuesOf(product, category));
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
        {withMore ? (
          <Link href={routes.item(product.id)} className="text-sm text-primary underline">
            {t('moreSettings')}
          </Link>
        ) : null}
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
