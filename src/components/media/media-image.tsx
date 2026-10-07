import Image, { type ImageProps } from 'next/image';

import { mediaConfig, type ImageSizePreset } from '@/config/media';
import { cn } from '@/lib/utils';

type MediaImageProps = Omit<ImageProps, 'fill' | 'sizes' | 'width' | 'height'> & {
  aspectRatio?: `${number}/${number}`;
  size?: ImageSizePreset;
  containerClassName?: string;
};

export function MediaImage({
  aspectRatio = '1/1',
  size = 'full',
  className,
  containerClassName,
  alt,
  ...props
}: MediaImageProps) {
  return (
    <div
      className={cn('relative overflow-hidden bg-muted', containerClassName)}
      style={{ aspectRatio }}
    >
      <Image
        fill
        alt={alt}
        sizes={mediaConfig.image.sizes[size]}
        className={cn('object-cover', className)}
        {...props}
      />
    </div>
  );
}
