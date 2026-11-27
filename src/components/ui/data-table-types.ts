import type { ReactNode } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  // A short explanation, opened by the (i) beside the heading.
  help?: string;
  cell: (row: T) => ReactNode;
  // What the column sorts by; leave out for a column that does not sort.
  sortValue?: (row: T) => string | number | boolean | null | undefined;
  align?: 'left' | 'right';
  className?: string;
  // The text a column search matches; defaults to the sort value. null: no search box.
  filterValue?: ((row: T) => string | null | undefined) | null;
};

export type DataTableProps<T> = {
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
  // Rows kept together under a heading each (units by what they measure). `order` is the order of the
  // headings; the column sort still orders the rows inside each one.
  // `collapsible`: each heading opens and closes its rows, closed to begin with (open while searching);
  // `summary` is what the heading says about its rows when closed.
  groupBy?: GroupBy<T>;
  // Opens every collapsible heading (the list is being searched, so the matches must show).
  expandAll?: boolean;
};

export type GroupBy<T> = {
  of: (row: T) => string;
  label: (key: string) => string;
  order: readonly string[];
  collapsible?: boolean;
  summary?: (rows: T[]) => ReactNode;
  // Headings to open now (after packets were made under an item, say).
  openWhen?: readonly string[];
  // Buttons on the heading line, for the rows under it.
  actions?: (rows: T[]) => ReactNode;
};
