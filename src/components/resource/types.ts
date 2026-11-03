import type { ReactNode } from 'react';

import type { ModalSize } from '@/components/ui/modal';

export type Option = { value: string; label: string };

export type FieldKind =
  | 'text'
  | 'password'
  | 'textarea'
  // Text the website shows as HTML: <p>, <br>, <strong> and lists.
  | 'html'
  | 'number'
  | 'money'
  | 'percent'
  | 'url'
  // One picture's address, chosen or uploaded through the media library.
  | 'image'
  // An ordered gallery of { url, altText }.
  | 'images'
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
  // Only changed on an existing record (an account's status).
  editOnly?: boolean;
  // A value the API takes as a structure, edited as text (one place per line).
  codec?: { toText: (value: unknown) => string; fromText: (text: string) => unknown };
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
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  // Off for lists the API cannot search.
  searchable?: boolean;
  // A list that comes inside another record (a kit's items), loaded whole.
  loadAll?: () => Promise<T[]>;
  // Extra query sent with every list request.
  listQuery?: Record<string, string>;
  // An Excel download of the list, taking its filters and search.
  exportPath?: string;
  // A rule across fields, checked before sending; names the field to mark.
  check?: (values: Record<string, unknown>) => { field: string; message: string } | null;
  // A record as its form edits it, when the API nests what the form sends as ids.
  formRow?: (row: T) => Record<string, unknown>;
  // The query root it refreshes with: packs of a product refresh the product list too.
  scope?: string;
  // One record with no id (the shop's settings): read and saved at its path with this method.
  singleton?: 'PUT' | 'PATCH';
  // Moves money or stock: the form sends one Idempotency-Key, so a retry cannot repeat it.
  idempotent?: boolean;
  // How a new record is sent; PUT for a list that replaces the old one.
  submitMethod?: 'POST' | 'PUT' | 'PATCH';
  // Fields offered as columns of the bulk-entry grid; leave out for no bulk entry.
  bulk?: string[];
};
