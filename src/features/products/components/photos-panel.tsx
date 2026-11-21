'use client';

import { SearchSelect } from '@/components/controls';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { uploadMedia } from '@/components/media-library/media-picker';
import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError, request } from '@/lib/api';

import type { Product } from './use-product';

type Photo = Product['images'][number];

const MAX_PHOTOS = 12;

// All of an item's photos in one place. A photo can be for one colour (or size): shoppers see it
// when they choose that value.
export function PhotosPanel({ product }: { product: Product }) {
  const t = useTranslations('itemPhotos');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const files = useRef<HTMLInputElement>(null);
  const photos = product.images;

  const values = product.options.flatMap((option) =>
    option.values.map((value) => ({
      id: value.valueId,
      label: `${option.nameEn}: ${value.valueEn}`,
    })),
  );

  const save = useMutation({
    mutationFn: (images: Photo[]) =>
      request('PATCH', `/admin/products/${product.id}`, { body: { images } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  const upload = useMutation({
    mutationFn: async (picked: File[]) => {
      const room = Math.max(0, MAX_PHOTOS - photos.length);
      const added: Photo[] = [];
      for (const file of picked.filter((f) => f.type.startsWith('image/')).slice(0, room)) {
        const { url } = await uploadMedia(file);
        added.push({ url, altText: null, optionValueId: null });
      }
      await request('PATCH', `/admin/products/${product.id}`, {
        body: { images: [...photos, ...added] },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  const change = (index: number, next: Partial<Photo>) =>
    save.mutate(photos.map((photo, i) => (i === index ? { ...photo, ...next } : photo)));
  const remove = (index: number) => save.mutate(photos.filter((_, i) => i !== index));
  const makeFirst = (index: number) =>
    save.mutate([photos[index]!, ...photos.filter((_, i) => i !== index)]);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{t('note')}</p>
      <input
        ref={files}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          upload.mutate([...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />
      <div>
        <Button
          icon="camera"
          disabled={upload.isPending || photos.length >= MAX_PHOTOS}
          onClick={() => files.current?.click()}
        >
          {upload.isPending ? t('uploading') : t('add')}
        </Button>
        <span className="ml-3 text-xs text-muted-foreground">
          {t('count', { count: photos.length, max: MAX_PHOTOS })}
        </span>
      </div>
      {photos.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t('none')}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={photo.url} className="grid gap-2 rounded-lg border border-border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- a stored photo */}
              <img
                src={photo.url}
                alt={photo.altText ?? ''}
                className="h-36 w-full rounded-md bg-muted object-cover"
              />
              <AltText
                key={`${photo.url}-${photo.altText ?? ''}`}
                value={photo.altText ?? ''}
                disabled={save.isPending}
                onSave={(altText) => change(index, { altText })}
              />
              <div className="grid gap-1 text-xs">
                {t('shownFor')}
                <SearchSelect
                  aria-label={t('shownFor')}
                  options={values.map((value) => ({ value: value.id, label: value.label }))}
                  placeholder={t('all')}
                  value={photo.optionValueId ?? ''}
                  disabled={save.isPending}
                  onChange={(value) => change(index, { optionValueId: String(value) || null })}
                />
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                {index === 0 ? (
                  <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                    {t('main')}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    disabled={save.isPending}
                    onClick={() => makeFirst(index)}
                  >
                    {t('makeMain')}
                  </button>
                )}
                <button
                  type="button"
                  className="text-destructive hover:underline"
                  disabled={save.isPending}
                  onClick={() => remove(index)}
                >
                  {t('remove')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// What the photo shows, for screen readers and search engines. Saved when the box is left.
function AltText({
  value,
  disabled,
  onSave,
}: {
  value: string;
  disabled: boolean;
  onSave: (altText: string | null) => void;
}) {
  const t = useTranslations('itemPhotos');
  const [text, setText] = useState(value);
  return (
    <label className="grid gap-1 text-xs">
      {t('altText')}
      <Input
        value={text}
        maxLength={160}
        disabled={disabled}
        placeholder={t('altPlaceholder')}
        aria-invalid={text.trim() === '' || undefined}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          const next = text.trim() || null;
          if (next !== (value.trim() || null)) onSave(next);
        }}
      />
      {text.trim() === '' ? <span className="text-warning">{t('altMissing')}</span> : null}
    </label>
  );
}
