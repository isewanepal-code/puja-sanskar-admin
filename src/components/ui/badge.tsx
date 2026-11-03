import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-muted-foreground',
        success: 'bg-success/12 text-success',
        warning: 'bg-warning/15 text-warning',
        danger: 'bg-destructive/10 text-destructive',
        info: 'bg-primary/10 text-primary',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

type BadgeProps = VariantProps<typeof badgeVariants> & { children: ReactNode; className?: string };

export function Badge({ tone, className, children }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)}>{children}</span>;
}
