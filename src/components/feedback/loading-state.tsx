'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

type LoadingStateProps = {
  label?: string;
  className?: string;
};

export function LoadingState({ label, className }: LoadingStateProps) {
  const t = useTranslations('common');

  return (
    <div
      className={cn('flex min-h-40 flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      <span className="text-sm text-muted-foreground">{label ?? t('loading')}</span>
    </div>
  );
}
