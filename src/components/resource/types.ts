import type { ReactNode } from 'react';

import type { ModalSize } from '@/components/ui/modal';

export type Option = { value: string; label: string };

export type FieldKind =
  | 'text'
  | 'textarea'
  // Text the website shows as HTML: <p>, <br>, <strong> and lists.
  | 'html'
  | 'number'
  | 'money'
  | 'percent'
  | 'url'
  | 'code'
  | 'slug'
  | 'time'
  | 'date'
  | 'datetime'
  | 'switch'
  | 'select'
  | 'multiselect'
  // Comma-separated words sent as a list.
  | 'tags';

export type Field = {
  // The API's property; its label is resources.<key>.fields.<name>.
  name: string;
  kind: FieldKind;
  required?: boolean;
  max?: number;
  // Fixed once the record exists (codes); shown only when creating.
  createOnly?: boolean;
  // A stricter rule than the kind's own (letters-only top-level codes).
  pattern?: { regex: RegExp; message: string };
  options?: Option[];
  // Choices that come from another endpoint, loaded once and cached under `key`.
  optionsFrom?: { key: string; load: () => Promise<Option[]> };
  // Takes the whole row of the form.
  wide?: boolean;
  // A heading the field starts, from resources.<key>.sections.<section>.
  section?: string;
  defaultValue?: string | boolean | string[];
};

export type Cell<T> = {
  // A field name, or its own label under resources.<key>.fields.
  key: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | boolean | null | undefined;
  align?: 'left' | 'right';
  className?: string;
};

export type Resource<T> = {
  // Messages under resources.<key>; query key for its list.
  key: string;
  // The API's admin path: '/admin/units'.
  path: string;
  // Lists either come whole or a page at a time with `q` searched by the API.
  list: 'all' | 'paged';
  rowId: (row: T) => string;
  // How a record is named in titles and the delete question.
  rowLabel: (row: T) => string;
  columns: Cell<T>[];
  fields: Field[];
  // Searching a whole list happens here; a paged one asks the API.
  matches?: (row: T, query: string) => boolean;
  initialSort?: { key: string; direction: 'asc' | 'desc' };
  modalSize?: ModalSize;
  canDelete?: boolean;
  // Extra query sent with every list request.
  listQuery?: Record<string, string>;
  // A record as its form edits it, when the API nests what the form sends as ids.
  formRow?: (row: T) => Record<string, unknown>;
  // Fields offered as columns of the bulk-entry grid; leave out for no bulk entry.
  bulk?: string[];
};
