'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { MediaPicker } from '@/components/media-library/media-picker';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Thumb } from '@/components/media-library/thumb';

import { readImages, type Image } from './form-values';

export function ImageInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const t = useTranslations('media');
  const [picking, setPicking] = useState(false);

  return (
    <div id={id} className="flex items-center gap-3">
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
        {value ? <Thumb src={value} size={64} className="size-full rounded-none" /> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon="camera" onClick={() => setPicking(true)}>
          {value ? t('change') : t('choose')}
        </Button>
        {value ? (
          <Button variant="ghost" size="sm" onClick={() => onChange('')}>
            {t('remove')}
          </Button>
        ) : null}
      </div>
      <MediaPicker
        open={picking}
        onOpenChange={setPicking}
        onPick={(media) => onChange(media.url)}
      />
    </div>
  );
}

export function ImagesInput({
  id,
  value,
  current,
  onChange,
}: {
  id: string;
  value: string;
  // The form's value now: several uploads land one after another.
  current: () => string;
  onChange: (json: string) => void;
}) {
  const t = useTranslations('media');
  const [picking, setPicking] = useState(false);
  const images = readImages(value);
  const save = (next: Image[]) => onChange(JSON.stringify(next));
  const move = (from: number, to: number) => {
    const next = [...images];
    const [image] = next.splice(from, 1);
    next.splice(to, 0, image!);
    save(next);
  };

  return (
    <div id={id} className="grid gap-2">
      {images.map((image, i) => (
        <div key={`${image.url}-${i}`} className="flex items-center gap-3">
          <Thumb src={image.url} size={56} className="size-14 shrink-0" />
          <Input
            value={image.altText ?? ''}
            placeholder={t('altText')}
            aria-label={t('altText')}
            maxLength={160}
            onChange={(event) =>
              save(
                images.map((img, j) =>
                  j === i ? { ...img, altText: event.target.value || null } : img,
                ),
              )
            }
          />
          {i === 0 ? (
            <span className="text-xs whitespace-nowrap text-muted-foreground">{t('main')}</span>
          ) : null}
          <IconButton
            icon="left"
            label={t('earlier')}
            className="rotate-90"
            disabled={i === 0}
            onClick={() => move(i, i - 1)}
          />
          <IconButton
            icon="left"
            label={t('later')}
            className="-rotate-90"
            disabled={i === images.length - 1}
            onClick={() => move(i, i + 1)}
          />
          <IconButton
            icon="trash"
            variant="danger"
            label={t('remove')}
            onClick={() => save(images.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      <div>
        <Button variant="secondary" size="sm" icon="camera" onClick={() => setPicking(true)}>
          {t('add')}
        </Button>
      </div>
      <MediaPicker
        open={picking}
        onOpenChange={setPicking}
        multiple
        onPick={(media) =>
          onChange(
            JSON.stringify([...readImages(current()), { url: media.url, altText: media.altText }]),
          )
        }
      />
    </div>
  );
}
