import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-40 flex-col items-center justify-center gap-3 px-4 text-center',
        className,
      )}
    >
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">{title}</h2>

        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>

      {action}
    </div>
  );
}
