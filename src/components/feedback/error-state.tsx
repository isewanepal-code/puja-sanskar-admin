import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type ErrorStateProps = {
  title?: string;
  message?: string;
  action?: ReactNode;
  className?: string;
};

export function ErrorState({ title, message, action, className }: ErrorStateProps) {
  const t = useTranslations('error');

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
        <h2 className="text-sm font-semibold">{title ?? t('title')}</h2>
        <p className="text-sm text-muted-foreground">{message ?? t('requestFailed')}</p>
      </div>
      {action}
    </div>
  );
}
