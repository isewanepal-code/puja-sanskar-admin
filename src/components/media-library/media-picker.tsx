'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';

import { Icon } from '@/components/icons';
import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { isApiError, request, toApiError, type Schema } from '@/lib/api';
import { Thumb } from '@/components/media-library/thumb';

export type Media = Schema<'MediaResponse'>;
type Page = { items: Media[]; meta: { page: number; totalPages: number } };

// The API's own limit for one upload.
const MAX_BYTES = 10 * 1024 * 1024;
const PAGE_SIZE = 24;

// A file goes to the API through the proxy, which adds the session.
export async function uploadMedia(file: File): Promise<Media> {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch('/api/proxy/api/v1/admin/media', {
    method: 'POST',
    credentials: 'same-origin',
    body,
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw toApiError(response.status, payload);
  return (payload as { data: Media }).data;
}

export function useMediaLibrary(enabled = true) {
  return useInfiniteQuery({
    queryKey: ['media', 'list'],
    queryFn: ({ pageParam }) =>
      request<Page>('GET', '/admin/media', { query: { page: pageParam, limit: PAGE_SIZE } }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    enabled,
  });
}

export function useUpload(onUploaded?: (media: Media) => void) {
  const t = useTranslations('media');
  const toast = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]) => {
      const uploaded: Media[] = [];
      for (const file of files) {
        if (file.size > MAX_BYTES) throw new Error(t('tooBig', { name: file.name }));
        uploaded.push(await uploadMedia(file));
      }
      return uploaded;
    },
    onSuccess: async (uploaded) => {
      toast.success(t('uploaded', { count: uploaded.length }));
      await queryClient.invalidateQueries({ queryKey: ['media'] });
      uploaded.forEach((media) => onUploaded?.(media));
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : (error as Error).message),
  });
}

type MediaPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Called once per picked or uploaded image.
  onPick: (media: Media) => void;
  multiple?: boolean;
};

// Choose an image already uploaded, or upload new ones; both hand back the media record.
export function MediaPicker({ open, onOpenChange, onPick, multiple = false }: MediaPickerProps) {
  const t = useTranslations('media');
  const input = useRef<HTMLInputElement>(null);
  const library = useMediaLibrary(open);
  const upload = useUpload((media) => {
    onPick(media);
    if (!multiple) onOpenChange(false);
  });
  const items = library.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={t('pickTitle')}
      description={t('pickNote')}
      footer={
        <>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple={multiple}
            className="sr-only"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length) upload.mutate(files);
              event.target.value = '';
            }}
          />
          <Button
            icon="upload"
            className="mr-auto"
            disabled={upload.isPending}
            onClick={() => input.current?.click()}
          >
            {upload.isPending ? t('uploading') : t('upload')}
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('done')}
          </Button>
        </>
      }
    >
      {library.isPending ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t('loading')}</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((media) => (
            <button
              key={media.id}
              type="button"
              onClick={() => {
                onPick(media);
                if (!multiple) onOpenChange(false);
              }}
              className="group relative aspect-square overflow-hidden rounded-md bg-muted ring-primary hover:ring-2 focus-visible:ring-2"
              title={media.originalName ?? undefined}
            >
              <Thumb
                src={media.urls.thumb}
                alt={media.altText}
                size={160}
                className="size-full rounded-none"
              />
              <span className="absolute inset-x-0 bottom-0 hidden bg-black/55 px-1.5 py-1 text-left text-[0.7rem] text-white group-hover:block">
                <Icon name="plus" size={12} className="mr-1 inline" />
                {t('use')}
              </span>
            </button>
          ))}
        </div>
      )}
      {library.hasNextPage ? (
        <div className="mt-4 text-center">
          <Button variant="secondary" size="sm" onClick={() => library.fetchNextPage()}>
            {t('more')}
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}
