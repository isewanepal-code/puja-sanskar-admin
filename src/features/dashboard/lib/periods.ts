// The ranges the dashboard offers, and the equal stretch before each, for "vs previous".
export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];
export const DEFAULT_RANGE: Range = 30;

export const parseRange = (value: string | undefined): Range =>
  RANGES.find((range) => String(range) === value) ?? DEFAULT_RANGE;

const DAY_MS = 86_400_000;

// Today as the shop counts it (Kathmandu), as YYYY-MM-DD.
export function shopToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export const addDays = (day: string, days: number): string =>
  new Date(Date.parse(day) + days * DAY_MS).toISOString().slice(0, 10);

export type DayRange = { from: string; to: string };

// The last `range` days up to today, and the same number of days just before them.
export function periodsFor(
  range: Range,
  today = shopToday(),
): { current: DayRange; previous: DayRange } {
  const from = addDays(today, -(range - 1));
  return {
    current: { from, to: today },
    previous: { from: addDays(from, -range), to: addDays(from, -1) },
  };
}

// How much a figure moved against the one before it; null when there was nothing to compare with.
export function changeOf(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
