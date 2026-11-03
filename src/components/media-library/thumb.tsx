import Image from 'next/image';

import { cn } from '@/lib/utils';

// An uploaded image at a fixed size; the API already serves resized copies, so Next leaves it as is.
export function Thumb({
  src,
  alt = '',
  size,
  className,
}: {
  src: string;
  alt?: string | null;
  size: number;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt ?? ''}
      width={size}
      height={size}
      unoptimized
      className={cn('rounded-md bg-muted object-cover', className)}
    />
  );
}
