import { AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

type ErrorStateProps = {
  title?: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
};

export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not complete your request. Please try again.',
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-40 flex-col items-center justify-center gap-3 px-4 text-center',
        className,
      )}
      role="alert"
    >
      <AlertCircle className="size-6" aria-hidden="true" />
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {action}
    </div>
  );
}
