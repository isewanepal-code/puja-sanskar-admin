import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

// A number with − and + beside it, so a count is raised or lowered by a click or a tap; it can still be typed.
export function QuantityStepper({
  value,
  onChange,
  label,
  min = 1,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
  min?: number;
  className?: string;
}) {
  const t = useTranslations('table');
  const current = Number(value) || 0;
  const step = (by: number) =>
    onChange(String(Math.max(min, Math.round((current + by) * 1000) / 1000)));
  const button =
    'grid size-9 shrink-0 place-items-center text-base text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40';
  return (
    <div
      className={cn(
        'inline-flex h-9 items-stretch overflow-hidden rounded-md border border-border bg-card focus-within:border-primary',
        className,
      )}
    >
      <button
        type="button"
        aria-label={t('less')}
        className={cn(button, 'border-r border-border')}
        disabled={current <= min}
        onClick={() => step(-1)}
      >
        −
      </button>
      <input
        aria-label={label}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-12 min-w-0 bg-transparent px-1 text-center text-sm outline-none"
      />
      <button
        type="button"
        aria-label={t('more')}
        className={cn(button, 'border-l border-border')}
        onClick={() => step(1)}
      >
        +
      </button>
    </div>
  );
}
