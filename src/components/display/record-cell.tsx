import type { ReactNode } from 'react';

import { Thumb } from '@/components/media-library/thumb';
import { cn } from '@/lib/utils';

type RecordCellProps = {
  // The name staff know it by, shown first and bold.
  title: ReactNode;
  // A second name (English, romanized) shown muted on the same line.
  also?: ReactNode;
  // A pack size or tier, as a chip.
  chip?: ReactNode;
  // The code or SKU, in a quiet monospace tag at the end.
  code?: string | null;
  image?: string | null;
  // Room for a picture even when there is none, so names line up.
  withImage?: boolean;
  className?: string;
};

// One record on one line: picture, name, chip, code. Every list names its records this way.
export function RecordCell({
  title,
  also,
  chip,
  code,
  image,
  withImage = image !== undefined,
  className,
}: RecordCellProps) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      {withImage ? (
        image ? (
          <Thumb src={image} size={36} className="size-9 shrink-0" />
        ) : (
          <span aria-hidden className="size-9 shrink-0 rounded-md bg-muted" />
        )
      ) : null}
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-medium whitespace-nowrap text-foreground">{title}</span>
        {chip ? (
          <span className="rounded-sm bg-primary/8 px-1.5 py-px text-xs whitespace-nowrap text-primary">
            {chip}
          </span>
        ) : null}
        {also ? <span className="truncate text-xs text-muted-foreground">{also}</span> : null}
        {code ? (
          <span className="rounded-sm border border-border px-1.5 py-px font-mono text-[0.7rem] whitespace-nowrap text-muted-foreground">
            {code}
          </span>
        ) : null}
      </span>
    </span>
  );
}
