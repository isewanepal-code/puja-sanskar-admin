import { cn } from '@/lib/utils';

type KpiCardProps = {
  label: string;
  value: string;
  // Percent against the stretch before; null when that stretch had nothing to compare with.
  change: number | null;
  // Words after the figure: "vs previous 30 days".
  against: string;
  newLabel: string;
  note?: string;
  // Daily values for a small line under the figure.
  spark?: number[];
};

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const top = Math.max(...values, 1);
  const points = values
    .map(
      (v, i) =>
        `${((i / (values.length - 1)) * 100).toFixed(1)},${(26 - (v / top) * 24).toFixed(1)}`,
    )
    .join(' ');
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-8 w-full" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// One figure with how it moved: green up, red down, and a line of its days.
export function KpiCard({ label, value, change, against, newLabel, note, spark }: KpiCardProps) {
  const up = change !== null && change > 0;
  const down = change !== null && change < 0;
  return (
    <div className="panel grid gap-1">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="font-heading text-2xl font-semibold tabular-nums">{value}</div>
      <div className="flex flex-wrap items-center gap-x-2 text-xs">
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold tabular-nums',
            up && 'bg-success/12 text-success',
            down && 'bg-destructive/10 text-destructive',
            !up && !down && 'bg-muted text-muted-foreground',
          )}
        >
          {change === null
            ? newLabel
            : `${up ? '▲' : down ? '▼' : '–'} ${Math.abs(change).toFixed(1)}%`}
        </span>
        <span className="text-muted-foreground">{against}</span>
      </div>
      {note ? <div className="text-xs text-muted-foreground">{note}</div> : null}
      {spark ? <Spark values={spark} /> : null}
    </div>
  );
}
