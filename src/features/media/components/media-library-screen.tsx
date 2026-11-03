'use client';

import { useTranslations } from 'next-intl';
import { useRef } from 'react';

import { useMediaLibrary, useUpload } from '@/components/media-library/media-picker';
import { useToast } from '@/components/overlays';
import { Button, IconButton } from '@/components/ui/button';
import { Thumb } from '@/components/media-library/thumb';

// Every uploaded image, newest first; upload here and use the address anywhere.
export function MediaLibraryScreen() {
  const t = useTranslations('media');
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const library = useMediaLibrary();
  const upload = useUpload();
  const items = library.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground">{t('libraryNote')}</p>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="sr-only"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length) upload.mutate(files);
            event.target.value = '';
          }}
        />
        <Button
          icon="upload"
          className="ml-auto"
          disabled={upload.isPending}
          onClick={() => input.current?.click()}
        >
          {upload.isPending ? t('uploading') : t('upload')}
        </Button>
      </div>
      {library.isPending ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t('loading')}</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((media) => (
            <figure key={media.id} className="grid gap-1.5">
              <Thumb
                src={media.urls.medium}
                alt={media.altText}
                size={320}
                className="aspect-square w-full"
              />
              <figcaption className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="min-w-0 flex-1 truncate" title={media.originalName ?? undefined}>
                  {media.width}×{media.height} · {Math.round(media.bytes / 1024)} KB
                </span>
                <IconButton
                  icon="copy"
                  label={t('copy')}
                  onClick={() =>
                    navigator.clipboard.writeText(media.url).then(() => toast.success(t('copied')))
                  }
                />
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {library.hasNextPage ? (
        <div className="text-center">
          <Button variant="secondary" size="sm" onClick={() => library.fetchNextPage()}>
            {t('more')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
