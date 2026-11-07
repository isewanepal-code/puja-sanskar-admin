import { cn } from '@/lib/utils';

type BarRowProps = {
  label: React.ReactNode;
  value: number;
  // The value the full bar stands for.
  max: number;
  display: string;
  tone?: 'primary' | 'good' | 'warn' | 'bad';
};

const FILL = {
  primary: 'bg-primary',
  good: 'bg-success',
  warn: 'bg-warning',
  bad: 'bg-destructive',
} as const;

// A label, a bar as long as its share of the largest, and the figure.
export function BarRow({ label, value, max, display, tone = 'primary' }: BarRowProps) {
  const share = max > 0 ? Math.max(value > 0 ? 3 : 0, Math.round((value / max) * 100)) : 0;
  return (
    <div className="grid grid-cols-[minmax(0,15rem)_1fr_auto] items-center gap-3 text-sm">
      <div className="min-w-0 truncate">{label}</div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div
          className={cn('h-full rounded-full transition-[width]', FILL[tone])}
          style={{ width: `${share}%` }}
        />
      </div>
      <div className="w-20 text-right font-semibold tabular-nums">{display}</div>
    </div>
  );
}
