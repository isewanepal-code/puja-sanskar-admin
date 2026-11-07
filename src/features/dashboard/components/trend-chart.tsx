'use client';

import { useId, useState } from 'react';

type Point = { day: string; value: number };

type TrendChartProps = {
  current: Point[];
  // The same number of days just before, matched by position.
  previous: Point[];
  currentLabel: string;
  previousLabel: string;
  // Read out for people who cannot see the picture.
  summary: string;
  empty: string;
};

const W = 760;
const H = 250;
const PAD = { left: 48, right: 14, top: 14, bottom: 28 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const full = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });
const dayName = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString('en', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

// A round top for the axis: 1, 2, 2.5, 5 or 10 times a power of ten above the largest value.
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value) ?? 10;
  return step * power;
}

// Daily sales as an area, with the stretch before it as a dashed line to compare against.
export function TrendChart({
  current,
  previous,
  currentLabel,
  previousLabel,
  summary,
  empty,
}: TrendChartProps) {
  const gradient = useId();
  const [hover, setHover] = useState<number | null>(null);
  const count = current.length;
  const top = niceMax(Math.max(0, ...current.map((p) => p.value), ...previous.map((p) => p.value)));
  const x = (index: number) =>
    PAD.left + (count <= 1 ? INNER_W / 2 : (index / (count - 1)) * INNER_W);
  const y = (value: number) => PAD.top + INNER_H - (value / top) * INNER_H;
  const line = (points: Point[]) =>
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
      .join(' ');
  const area = `${line(current)} L${x(count - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((share) => share * top);
  const nothing = current.every((p) => p.value === 0) && previous.every((p) => p.value === 0);
  const labelAt = [0, Math.floor((count - 1) / 2), count - 1].filter(
    (index, i, all) => count > 0 && all.indexOf(index) === i,
  );

  const move = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const at = ((event.clientX - box.left) / box.width) * W;
    const index = Math.round(((at - PAD.left) / INNER_W) * (count - 1));
    setHover(Math.min(count - 1, Math.max(0, index)));
  };

  const now = hover === null ? null : current[hover];
  const before = hover === null ? null : previous[hover];

  return (
    <figure className="relative">
      <figcaption className="sr-only">{summary}</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-pan-y"
        role="img"
        aria-label={summary}
        onPointerMove={move}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--color-border)"
              strokeDasharray={tick === 0 ? undefined : '3 4'}
            />
            <text
              x={PAD.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[11px] tabular-nums"
            >
              {compact.format(tick)}
            </text>
          </g>
        ))}

        {labelAt.map((index) => (
          <text
            key={index}
            x={x(index)}
            y={H - 8}
            textAnchor={index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle'}
            className="fill-muted-foreground text-[11px]"
          >
            {dayName(current[index]!.day)}
          </text>
        ))}

        {count > 0 ? (
          <>
            <path
              d={line(previous)}
              fill="none"
              stroke="var(--color-muted-foreground)"
              strokeWidth="1.75"
              strokeDasharray="5 5"
              strokeLinejoin="round"
              opacity="0.7"
            />
            <path d={area} fill={`url(#${gradient})`} />
            <path
              d={line(current)}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        ) : null}

        {hover !== null && now ? (
          <g pointerEvents="none">
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + INNER_H}
              stroke="var(--color-muted-foreground)"
              strokeOpacity="0.5"
            />
            {before ? (
              <circle
                cx={x(hover)}
                cy={y(before.value)}
                r="4"
                fill="var(--color-muted-foreground)"
              />
            ) : null}
            <circle
              cx={x(hover)}
              cy={y(now.value)}
              r="5"
              fill="var(--color-card)"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
            />
          </g>
        ) : null}
      </svg>

      {nothing ? (
        <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : null}

      {hover !== null && now ? (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${hover > count / 2 ? '-105%' : '5%'})`,
          }}
        >
          <div className="mb-1 font-medium">{dayName(now.day)}</div>
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" />
              {currentLabel}
            </span>
            <span className="font-semibold tabular-nums">Rs {full.format(now.value)}</span>
          </div>
          {before ? (
            <div className="mt-0.5 flex items-center justify-between gap-4 text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-muted-foreground" />
                {previousLabel} · {dayName(before.day)}
              </span>
              <span className="tabular-nums">Rs {full.format(before.value)}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </figure>
  );
}
