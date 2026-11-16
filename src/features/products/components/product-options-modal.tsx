'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { uploadMedia } from '@/components/media-library/media-picker';
import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { isApiError, request, type Schema } from '@/lib/api';

import type { OptionType } from '../options';

type Product = Schema<'AdminProductResponse'>;
type Picked = Record<string, string[]>;

const MAX_OPTIONS = 3;

// A colour as a dot, any other value as words.
function Dot({ type, hex }: { type: OptionType; hex: string | null }) {
  return type.kind === 'COLOR' && hex ? (
    <span
      className="inline-block size-4 rounded-full border border-border"
      style={{ background: hex }}
      aria-hidden="true"
    />
  ) : null;
}

// What makes this item's packs differ: choose the kinds and values, make every combination at
// once, and give each colour its own photos.
export function ProductOptionsModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const t = useTranslations('productOptionsEditor');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const files = useRef<HTMLInputElement>(null);
  const [photoFor, setPhotoFor] = useState<string | null>(null);

  const types = useQuery({
    queryKey: ['optionTypes', 'active'],
    queryFn: () =>
      request<OptionType[]>('GET', '/admin/option-types', { query: { isActive: true } }),
  });
  const current = useQuery({
    queryKey: ['products', 'one', product.id],
    queryFn: () => request<Product>('GET', `/admin/products/${product.id}`),
    initialData: product,
  });
  const now = current.data;

  // What the product already has is ticked to start with.
  const [picked, setPicked] = useState<Picked>(() =>
    Object.fromEntries(
      product.options.map((o) => [o.optionTypeId, o.values.map((v) => v.valueId)]),
    ),
  );
  const [price, setPrice] = useState(() => product.variants[0]?.price ?? '');
  const chosen = Object.entries(picked).filter(([, ids]) => ids.length > 0);
  const total = chosen.reduce((n, [, ids]) => n * ids.length, 1);

  const toggle = (typeId: string, valueId: string) =>
    setPicked((was) => {
      const ids = was[typeId] ?? [];
      return {
        ...was,
        [typeId]: ids.includes(valueId) ? ids.filter((id) => id !== valueId) : [...ids, valueId],
      };
    });

  const generate = useMutation({
    mutationFn: () =>
      request<{ created: unknown[]; skipped: number }>(
        'POST',
        `/admin/products/${product.id}/variants/generate`,
        {
          body: {
            options: chosen.map(([optionTypeId, valueIds]) => ({ optionTypeId, valueIds })),
            price,
          },
        },
      ),
    onSuccess: async ({ created, skipped }) => {
      toast.success(t('made', { created: created.length, skipped }));
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  const addPhoto = useMutation({
    mutationFn: async ({ file, valueId }: { file: File; valueId: string }) => {
      const { url } = await uploadMedia(file);
      await request('PATCH', `/admin/products/${product.id}`, {
        body: {
          images: [...now.images, { url, altText: null, optionValueId: valueId }],
        },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });
  const removePhoto = useMutation({
    mutationFn: (url: string) =>
      request('PATCH', `/admin/products/${product.id}`, {
        body: { images: now.images.filter((image) => image.url !== url) },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  // Photos go with the first kind of difference the shop shows as a colour, else the first kind.
  const photoType = now.options.find((o) => o.kind === 'COLOR') ?? now.options[0];
  const tooMany = chosen.length > MAX_OPTIONS;

  return (
    <Modal
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      size="xl"
      title={t('title', { name: product.nameNe })}
      description={t('note')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('close')}
          </Button>
          <Button
            onClick={() => generate.mutate()}
            disabled={chosen.length === 0 || tooMany || !price || generate.isPending}
          >
            {generate.isPending ? tf('saving') : t('make', { count: total })}
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <section className="grid gap-3">
          <h3 className="text-sm font-semibold">{t('kinds')}</h3>
          {(types.data ?? []).map((type) => (
            <fieldset key={type.id} className="rounded-lg border border-border p-3">
              <legend className="px-1 text-sm font-medium">
                {type.nameEn} <span className="text-muted-foreground">· {type.nameNe}</span>
              </legend>
              {type.values.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('noValues')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {type.values.map((value) => {
                    const on = (picked[type.id] ?? []).includes(value.id);
                    return (
                      <label
                        key={value.id}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                          on ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={on}
                          onChange={() => toggle(type.id, value.id)}
                        />
                        <Dot type={type} hex={value.colorHex} />
                        {value.valueEn}
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>
          ))}
          {tooMany ? (
            <p className="text-sm text-destructive">{t('tooMany', { n: MAX_OPTIONS })}</p>
          ) : null}
        </section>

        <section className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-end">
          <label className="grid gap-1 text-sm">
            {t('price')}
            <Input
              value={price}
              inputMode="decimal"
              onChange={(event) => setPrice(event.target.value)}
              placeholder="500"
            />
          </label>
          <p className="text-sm text-muted-foreground">{t('priceNote', { count: total })}</p>
        </section>

        {photoType ? (
          <section className="grid gap-3">
            <h3 className="text-sm font-semibold">{t('photos', { kind: photoType.nameEn })}</h3>
            <p className="text-sm text-muted-foreground">{t('photosNote')}</p>
            <input
              ref={files}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file && photoFor) addPhoto.mutate({ file, valueId: photoFor });
                event.target.value = '';
              }}
            />
            {photoType.values.map((value) => (
              <div key={value.valueId} className="flex flex-wrap items-center gap-3">
                <span className="w-32 text-sm font-medium">{value.valueEn}</span>
                {now.images
                  .filter((image) => image.optionValueId === value.valueId)
                  .map((image) => (
                    <span key={image.url} className="group relative">
                      {/* eslint-disable-next-line @next/next/no-img-element -- a stored photo */}
                      <img
                        src={image.url}
                        alt=""
                        className="h-14 w-14 rounded border border-border object-cover"
                      />
                      <button
                        type="button"
                        aria-label={t('removePhoto')}
                        className="absolute -top-1.5 -right-1.5 hidden size-5 place-items-center rounded-full bg-destructive text-xs text-white group-hover:grid"
                        onClick={() => removePhoto.mutate(image.url)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                <Button
                  variant="secondary"
                  icon="camera"
                  disabled={addPhoto.isPending}
                  onClick={() => {
                    setPhotoFor(value.valueId);
                    files.current?.click();
                  }}
                >
                  {t('addPhoto')}
                </Button>
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </Modal>
  );
}
