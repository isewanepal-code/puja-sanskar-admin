'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState, type ReactNode } from 'react';

import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  // What the column sorts by; leave out for a column that does not sort.
  sortValue?: (row: T) => string | number | boolean | null | undefined;
  align?: 'left' | 'right';
  className?: string;
  // The text a column search matches; defaults to the sort value. null: no search box.
  filterValue?: ((row: T) => string | null | undefined) | null;
};

type DataTableProps<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  // Edit, delete and the like, at the end of each row.
  actions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: ReactNode;
  initialSort?: { key: string; direction: 'asc' | 'desc' };
  // A search box under each heading that narrows the rows shown.
  columnSearch?: boolean;
};

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

const normalize = (value: unknown) =>
  value === null || value === undefined ? '' : String(value).toLowerCase();

function filterOf<T>(column: Column<T>): ((row: T) => unknown) | null {
  if (column.filterValue === null) return null;
  return column.filterValue ?? column.sortValue ?? null;
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a ? -1 : 1;
  return collator.compare(String(a), String(b));
}

// The one table of the admin: ruled columns, sortable headings with a search under each,
// banded rows, actions at the end.
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  actions,
  onRowClick,
  loading = false,
  empty,
  initialSort,
  columnSearch = true,
}: DataTableProps<T>) {
  const t = useTranslations('table');
  const [sort, setSort] = useState(initialSort);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const searchable = columnSearch && columns.some((column) => filterOf(column));
  // Yes/no columns get a choice instead of a text box.
  const isYesNo = (column: Column<T>) => {
    const value = rows[0] ? filterOf(column)?.(rows[0]) : undefined;
    return typeof value === 'boolean';
  };

  const sorted = useMemo(() => {
    const active = Object.entries(filters).filter(([, value]) => value.trim() !== '');
    const filtered = active.length
      ? rows.filter((row) =>
          active.every(([key, wanted]) => {
            const column = columns.find((c) => c.key === key);
            const value = column && filterOf(column)?.(row);
            if (typeof value === 'boolean') return String(value) === wanted;
            return normalize(value).includes(wanted.trim().toLowerCase());
          }),
        )
      : rows;
    const column = columns.find((c) => c.key === sort?.key);
    if (!sort || !column?.sortValue) return filtered;
    const by = column.sortValue;
    const sign = sort.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => sign * compare(by(a), by(b)));
  }, [rows, columns, sort, filters]);
  const filtering = Object.values(filters).some((value) => value.trim() !== '');

  const toggle = (key: string) =>
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-muted/60">
          <tr className="border-b border-border text-xs text-muted-foreground uppercase">
            {columns.map((column) => {
              const active = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                  className={cn(
                    'border-r border-border/70 px-3 py-2.5 font-semibold tracking-wide whitespace-nowrap last:border-r-0',
                    column.align === 'right' && 'text-right',
                    column.className,
                  )}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggle(column.key)}
                      className={cn(
                        'inline-flex items-center gap-1 uppercase hover:text-foreground',
                        active && 'text-foreground',
                      )}
                    >
                      {column.header}
                      <Icon
                        name="down"
                        size={12}
                        className={cn(
                          'transition-transform',
                          !active && 'opacity-30',
                          active && sort.direction === 'asc' && 'rotate-180',
                        )}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
            {actions ? (
              <th className="px-3 py-2.5">
                <span className="sr-only">{t('actions')}</span>
              </th>
            ) : null}
          </tr>
          {searchable ? (
            <tr className="border-b border-border">
              {columns.map((column) => {
                const filter = filterOf(column);
                const value = filters[column.key] ?? '';
                const set = (next: string) =>
                  setFilters((current) => ({ ...current, [column.key]: next }));
                const label = t('searchColumn', { column: column.header });
                return (
                  <th
                    key={column.key}
                    className="border-r border-border/70 px-2 py-1.5 font-normal last:border-r-0"
                  >
                    {!filter ? null : isYesNo(column) ? (
                      <select
                        value={value}
                        onChange={(event) => set(event.target.value)}
                        aria-label={label}
                        className="h-7 w-full min-w-16 rounded-sm border border-border bg-card px-1.5 text-xs text-foreground"
                      >
                        <option value="">{t('any')}</option>
                        <option value="true">{t('yes')}</option>
                        <option value="false">{t('no')}</option>
                      </select>
                    ) : (
                      <input
                        type="search"
                        value={value}
                        onChange={(event) => set(event.target.value)}
                        placeholder={t('filter')}
                        aria-label={label}
                        className="h-7 w-full min-w-20 rounded-sm border border-border bg-card px-2 text-xs font-normal text-foreground normal-case placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
                      />
                    )}
                  </th>
                );
              })}
              {actions ? <th /> : null}
            </tr>
          ) : null}
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="px-3 py-10 text-center text-muted-foreground"
              >
                {t('loading')}
              </td>
            </tr>
          ) : sorted.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="px-3 py-10 text-center text-muted-foreground"
              >
                {filtering ? t('noMatch') : (empty ?? t('empty'))}
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-border/60 transition-colors last:border-0 even:bg-muted/25 hover:bg-primary/5',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'border-r border-border/50 px-3 py-2.5 align-middle last:border-r-0',
                      column.align === 'right' && 'text-right',
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
                {actions ? (
                  <td
                    className="px-3 py-1.5 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actions(row)}
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
