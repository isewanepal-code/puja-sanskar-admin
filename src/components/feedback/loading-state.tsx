import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

type LoadingStateProps = {
  label?: string;
  className?: string;
};

export function LoadingState({ label = 'Loading...', className }: LoadingStateProps) {
  return (
    <div
      className={cn('flex min-h-40 flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
