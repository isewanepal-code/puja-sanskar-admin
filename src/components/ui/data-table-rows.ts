import { searchKey } from '@/lib/nepali-fold';

import type { Column, GroupBy } from './data-table-types';

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

export const normalize = (value: unknown) =>
  value === null || value === undefined ? '' : searchKey(String(value));

// What a column's search looks at: its own search text, else what it sorts by; null for no search.
export function filterOf<T>(column: Column<T>): ((row: T) => unknown) | null {
  if (column.filterValue === null) return null;
  return column.filterValue ?? column.sortValue ?? null;
}

export function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a ? -1 : 1;
  return collator.compare(String(a), String(b));
}

// Columns whose search text is yes/no: they get a choice instead of a text box.
export function yesNoColumns<T>(columns: Column<T>[], first: T | undefined): Set<string> {
  if (first === undefined) return new Set();
  return new Set(
    columns
      .filter((column) => typeof filterOf(column)?.(first) === 'boolean')
      .map((column) => column.key),
  );
}

// Rows that match every filled search; a yes/no column matches exactly, text matches in part.
export function filterRows<T>(
  rows: T[],
  columns: Column<T>[],
  active: [key: string, wanted: string][],
): T[] {
  if (active.length === 0) return rows;
  return rows.filter((row) =>
    active.every(([key, wanted]) => {
      const column = columns.find((c) => c.key === key);
      const value = column && filterOf(column)?.(row);
      if (typeof value === 'boolean') return String(value) === wanted;
      return normalize(value).includes(searchKey(wanted.trim()));
    }),
  );
}

export function sortRows<T>(
  rows: T[],
  columns: Column<T>[],
  sort: { key: string; direction: 'asc' | 'desc' } | undefined,
): T[] {
  const by = columns.find((c) => c.key === sort?.key)?.sortValue;
  if (!by) return rows;
  const sign = sort?.direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => sign * compare(by(a), by(b)));
}

// The headings in their own order; the order of the rows is kept inside each (the sort is stable).
export function groupRows<T>(ordered: T[], groupBy: GroupBy<T> | undefined): T[] {
  if (!groupBy) return ordered;
  const firstSeen = new Map<string, number>();
  ordered.forEach((row, index) => {
    if (!firstSeen.has(groupBy.of(row))) firstSeen.set(groupBy.of(row), index);
  });
  const rank = (row: T) => {
    // No fixed order given: a heading stands where its first row is in the sorted list.
    if (groupBy.order.length === 0) return firstSeen.get(groupBy.of(row)) ?? 0;
    const at = groupBy.order.indexOf(groupBy.of(row));
    return at === -1 ? groupBy.order.length : at;
  };
  return [...ordered].sort((a, b) => rank(a) - rank(b));
}
