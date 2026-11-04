'use client';

import { Popover } from '@base-ui/react/popover';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

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
  // For a list that comes a page at a time: text typed under a heading goes here (the API
  // searches every page) instead of narrowing only the rows on screen.
  onTextSearch?: (texts: Record<string, string>) => void;
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
  onTextSearch,
}: DataTableProps<T>) {
  const t = useTranslations('table');
  const [sort, setSort] = useState(initialSort);
  // Whether rows run under the pinned first column or actions, so they cast a shadow.
  const [under, setUnder] = useState({ left: false, right: false });
  const observer = useRef<ResizeObserver | null>(null);
  const measure = useCallback((el: HTMLElement) => {
    const left = el.scrollLeft > 0;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setUnder((was) => (was.left === left && was.right === right ? was : { left, right }));
  }, []);
  const scroller = useCallback(
    (el: HTMLDivElement | null) => {
      observer.current?.disconnect();
      if (!el) return;
      observer.current = new ResizeObserver(() => measure(el));
      observer.current.observe(el);
      if (el.firstElementChild) observer.current.observe(el.firstElementChild);
    },
    [measure],
  );
  const [filters, setFilters] = useState<Record<string, string>>({});

  const searchable = columnSearch && columns.some((column) => filterOf(column));
  // Yes/no columns get a choice instead of a text box.
  const isYesNo = (column: Column<T>) => {
    const value = rows[0] ? filterOf(column)?.(rows[0]) : undefined;
    return typeof value === 'boolean';
  };
  const yesNoKeys = useMemo(
    () =>
      new Set(
        columns
          .filter((column) => {
            const value = rows[0] ? filterOf(column)?.(rows[0]) : undefined;
            return typeof value === 'boolean';
          })
          .map((column) => column.key),
      ),
    [columns, rows],
  );
  const setFilter = (key: string, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    if (onTextSearch && !yesNoKeys.has(key)) {
      onTextSearch(
        Object.fromEntries(Object.entries(next).filter(([k, v]) => !yesNoKeys.has(k) && v.trim())),
      );
    }
  };

  const sorted = useMemo(() => {
    const active = Object.entries(filters).filter(
      ([key, value]) => value.trim() !== '' && !(onTextSearch && !yesNoKeys.has(key)),
    );
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
  }, [rows, columns, sort, filters, onTextSearch, yesNoKeys]);
  const filtering = Object.values(filters).some((value) => value.trim() !== '');

  const toggle = (key: string) =>
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );

  return (
    // Scrolls both ways inside itself, so the heading stays on top and the first column at left.
    <div
      ref={scroller}
      onScroll={(event) => measure(event.currentTarget)}
      className="max-h-[calc(100dvh-14rem)] overflow-auto rounded-md border border-border bg-card"
    >
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
                        onChange={(next) => setFilter(column.key, next)}
                      />
                    ) : null}
                  </span>
                </th>
              );
            })}
            {actions ? (
              <th
                className={cn(
                  'sticky right-0 z-10 w-px border-b border-border bg-muted px-3 py-2.5',
                  under.right && 'shadow-[-6px_0_8px_-6px_rgb(0_0_0/0.18)]',
                )}
              >
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
                      pinFirst && index === 0 && 'pin sticky left-0 z-[5] whitespace-nowrap',
                      pinFirst &&
                        index === 0 &&
                        under.left &&
                        'shadow-[6px_0_8px_-6px_rgb(0_0_0/0.18)]',
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
                {actions ? (
                  <td
                    className={cn(
                      'pin sticky right-0 z-[5] border-b border-border px-3 py-1.5 text-right whitespace-nowrap group-last/row:border-b-0',
                      under.right && 'shadow-[-6px_0_8px_-6px_rgb(0_0_0/0.18)]',
                    )}
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
