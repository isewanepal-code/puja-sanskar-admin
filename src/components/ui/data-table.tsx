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
};

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a ? -1 : 1;
  return collator.compare(String(a), String(b));
}

// The one table of the admin: sortable headings, quiet rows, actions at the end.
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  actions,
  onRowClick,
  loading = false,
  empty,
  initialSort,
}: DataTableProps<T>) {
  const t = useTranslations('table');
  const [sort, setSort] = useState(initialSort);

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sort?.key);
    if (!sort || !column?.sortValue) return rows;
    const by = column.sortValue;
    const sign = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => sign * compare(by(a), by(b)));
  }, [rows, columns, sort]);

  const toggle = (key: string) =>
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
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
                    'px-3 py-2 font-medium tracking-wide',
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
              <th className="px-3 py-2">
                <span className="sr-only">{t('actions')}</span>
              </th>
            ) : null}
          </tr>
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
                {empty ?? t('empty')}
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-border/60 last:border-0 hover:bg-muted/60',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-3 py-2.5 align-middle',
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
