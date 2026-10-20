import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

type LoadingStateProps = {
  label?: string;
  // Placeholder cards that hold the layout while a grid loads.
  cards?: number;
  className?: string;
};

export function LoadingState({ label, cards = 0, className }: LoadingStateProps) {
  const t = useTranslations('common');

  return (
    <div
      className={cn(cards > 0 ? 'grid-products grid' : 'empty', className)}
      role="status"
      aria-live="polite"
    >
      <span className={cards > 0 ? 'sr-only' : 'muted'}>{label ?? t('loading')}</span>
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="skeleton sk-card" aria-hidden="true" />
      ))}
    </div>
  );
}
