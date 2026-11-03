'use client';

import { Popover } from '@base-ui/react/popover';
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
  // Keeps the first column in view while the table scrolls sideways (on by default).
  pinFirst?: boolean;
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
  pinFirst = true,
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
    // Scrolls both ways inside itself, so the heading stays on top and the first column at left.
    <div className="max-h-[calc(100dvh-14rem)] min-h-40 overflow-auto rounded-md border border-border bg-card">
      <table className="w-full border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-20">
          <tr className="text-xs text-muted-foreground uppercase">
            {columns.map((column, index) => {
              const active = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                  className={cn(
                    'group border-r border-b border-border bg-muted px-3 py-2.5 font-semibold tracking-wide whitespace-nowrap last:border-r-0',
                    column.align === 'right' && 'text-right',
                    pinFirst &&
                      index === 0 &&
                      'sticky left-0 z-10 shadow-[1px_0_0_var(--color-border)]',
                    column.className,
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex items-center gap-1',
                      column.align === 'right' && 'flex-row-reverse',
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
                    {searchable && filterOf(column) ? (
                      <ColumnSearch
                        label={t('searchColumn', { column: column.header })}
                        value={filters[column.key] ?? ''}
                        yesNo={isYesNo(column)}
                        onChange={(next) =>
                          setFilters((current) => ({ ...current, [column.key]: next }))
                        }
                      />
                    ) : null}
                  </span>
                </th>
              );
            })}
            {actions ? (
              <th className="sticky right-0 z-10 w-px border-b border-border bg-muted px-3 py-2.5 shadow-[-1px_0_0_var(--color-border)]">
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
                {filtering ? t('noMatch') : (empty ?? t('empty'))}
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('data-row group/row', onRowClick && 'cursor-pointer')}
              >
                {columns.map((column, index) => (
                  <td
                    key={column.key}
                    className={cn(
                      'border-r border-b border-border px-3 py-2.5 align-middle group-last/row:border-b-0',
                      column.align === 'right' && 'text-right',
                      pinFirst &&
                        index === 0 &&
                        'pin sticky left-0 z-[5] shadow-[1px_0_0_var(--color-border)]',
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
                {actions ? (
                  <td
                    className="pin sticky right-0 z-[5] border-b border-border px-3 py-1.5 text-right whitespace-nowrap shadow-[-1px_0_0_var(--color-border)] group-last/row:border-b-0"
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

type ColumnSearchProps = {
  label: string;
  value: string;
  yesNo: boolean;
  onChange: (value: string) => void;
};

// The funnel beside a heading: a small search for that column, marked while it narrows rows.
function ColumnSearch({ label, value, yesNo, onChange }: ColumnSearchProps) {
  const t = useTranslations('table');
  const active = value.trim() !== '';
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={label}
        title={label}
        className={cn(
          'relative grid size-6 place-items-center rounded-sm transition-colors hover:bg-card hover:text-foreground',
          active
            ? 'text-primary'
            : 'text-muted-foreground/35 group-hover:text-muted-foreground data-[popup-open]:text-foreground',
        )}
      >
        <Icon name="filter" size={12} />
        {active ? (
          <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-primary" />
        ) : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-50">
          <Popover.Popup
            initialFocus={(type) => type === 'keyboard' || undefined}
            className="w-60 rounded-md bg-card p-2.5 text-left normal-case shadow-lg ring-1 ring-border outline-none"
          >
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
            {yesNo ? (
              <div className="grid grid-cols-3 gap-1">
                {(['', 'true', 'false'] as const).map((choice) => (
                  <button
                    key={choice || 'any'}
                    type="button"
                    onClick={() => onChange(choice)}
                    className={cn(
                      'h-8 rounded-sm border border-border text-sm transition-colors hover:bg-muted',
                      value === choice && 'border-primary bg-primary/8 text-primary',
                    )}
                  >
                    {choice === '' ? t('any') : choice === 'true' ? t('yes') : t('no')}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="search"
                autoFocus
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={t('filter')}
                className="h-9 w-full rounded-sm border border-border bg-card px-2.5 text-sm focus:border-primary focus:outline-none"
              />
            )}
            {active ? (
              <button
                type="button"
                onClick={() => onChange('')}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {t('clearFilter')}
              </button>
            ) : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
