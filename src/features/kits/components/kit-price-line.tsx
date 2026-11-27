import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

// One line of the price sum: a label and an amount, so the whole sum reads top to bottom.
export function PriceLine({
  label,
  value,
  note,
  strong,
  muted,
  top,
}: {
  label: string;
  value: number;
  note?: string;
  strong?: boolean;
  muted?: boolean;
  top?: boolean;
}) {
  return (
    <div className={cn(top && 'mt-1 border-t border-border pt-1.5')}>
      <div
        className={cn(
          'flex justify-between gap-3',
          strong && 'font-semibold',
          muted && 'text-muted-foreground',
        )}
      >
        <span>{label}</span>
        <span className="tabular-nums">
          {value < 0 ? '− ' : ''}
          {formatMoney(String(Math.abs(value)), 'en')}
        </span>
      </div>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}
