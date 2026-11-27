'use client';

import { useTranslations } from 'next-intl';
import { Fragment, useCallback, useMemo, useRef, useState } from 'react';

import { Icon } from '@/components/icons';
import { InfoTip } from '@/components/ui/info-tip';
import { cn } from '@/lib/utils';

import { ColumnSearch } from './column-search';
import { GroupHeading } from './data-table-group';
import { filterOf, filterRows, groupRows, sortRows, yesNoColumns } from './data-table-rows';
import type { DataTableProps } from './data-table-types';

export type { Column, DataTableProps, GroupBy } from './data-table-types';

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
  groupBy,
  expandAll = false,
}: DataTableProps<T>) {
  const t = useTranslations('table');
  const [sort, setSort] = useState(initialSort);
  // Headings opened by hand (a collapsible group).
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const openWhenKey = (groupBy?.openWhen ?? []).join('\u0001');
  // New headings to open are taken in while rendering (not in an effect), once per change.
  const [seenOpenWhen, setSeenOpenWhen] = useState('');
  if (openWhenKey !== seenOpenWhen) {
    setSeenOpenWhen(openWhenKey);
    if (openWhenKey) setOpened((was) => new Set([...was, ...openWhenKey.split('\u0001')]));
  }
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
  const yesNoKeys = useMemo(() => yesNoColumns(columns, rows[0]), [columns, rows]);
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
    return groupRows(sortRows(filterRows(rows, columns, active), columns, sort), groupBy);
  }, [rows, columns, sort, filters, onTextSearch, yesNoKeys, groupBy]);
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
                    {column.help ? (
                      <InfoTip
                        text={column.help}
                        label={column.header}
                        align={column.align === 'right' ? 'right' : 'left'}
                      />
                    ) : null}
                    {searchable && filterOf(column) ? (
                      <ColumnSearch
                        label={t('searchColumn', { column: column.header })}
                        value={filters[column.key] ?? ''}
                        yesNo={yesNoKeys.has(column.key)}
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
            sorted.map((row, at) => {
              const heading = groupBy?.of(row);
              const first = groupBy && (at === 0 || groupBy.of(sorted[at - 1]!) !== heading);
              const isOpen =
                !groupBy?.collapsible ||
                filtering ||
                expandAll ||
                (heading !== undefined && opened.has(heading));
              const members = first ? sorted.filter((r) => groupBy!.of(r) === heading) : [];
              return (
                <Fragment key={rowKey(row)}>
                  {first && groupBy ? (
                    <GroupHeading
                      groupBy={groupBy}
                      heading={heading!}
                      members={members}
                      isOpen={isOpen}
                      colSpan={columns.length + 1}
                      onToggle={() =>
                        setOpened((was) => {
                          const next = new Set(was);
                          if (next.has(heading!)) next.delete(heading!);
                          else next.add(heading!);
                          return next;
                        })
                      }
                    />
                  ) : null}
                  {isOpen ? (
                    <tr
                      onClick={
                        onRowClick
                          ? (event) => {
                              // A link or button inside the row does its own job; it does not also open the row.
                              if (
                                (event.target as HTMLElement).closest(
                                  'a, button, input, select, textarea, label',
                                )
                              )
                                return;
                              onRowClick(row);
                            }
                          : undefined
                      }
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
                  ) : null}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
