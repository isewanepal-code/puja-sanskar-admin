import { activeColumn, codeColumn, recordColumn, type Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { request, type Schema } from '@/lib/api';
import { choices, wholeSource } from '@/lib/choices';

type Category = Schema<'AdminCategoryResponse'>;
type CategoryNode = Category & { children: CategoryNode[] };
type Material = Schema<'AdminMaterialResponse'>;
type Unit = Schema<'UnitResponse'>;
type Source = Schema<'SourceResponse'>;
type Brand = Schema<'BrandResponse'>;

const flatten = (nodes: CategoryNode[]): CategoryNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children)]);

// Every category in tree order; a sub-category reads "parent › child", so its level shows
// at a glance and a search finds it by either name.
export const categoryChoices = wholeSource('categories', async () => {
  const nodes = flatten(await request<CategoryNode[]>('GET', '/admin/categories/tree'));
  const names = new Map(nodes.map((c) => [c.id, c.nameNe]));
  return nodes.map((c) => ({
    value: c.id,
    label: c.parentId ? `${names.get(c.parentId) ?? ''} › ${c.nameNe}` : c.nameNe,
    detail: [c.nameEn, c.code].filter(Boolean).join(' · '),
  }));
});

// `parentName` names a category's parent in the list.
export function categoriesResource(
  parentName: (id: string) => string | undefined,
): Resource<Category> {
  return {
    key: 'categories',
    path: '/admin/categories',
    list: 'paged',
    rowId: (row) => row.id,
    rowLabel: (row) => `${row.code} · ${row.nameNe}`,
    initialSort: { key: 'code', direction: 'asc' },
    bulk: ['code', 'nameNe', 'nameEn', 'parentId'],
    formRow: (row) => ({ ...row, subCategory: Boolean(row.parentId) }),
    shapeBody: ({ subCategory, ...body }) => ({
      ...body,
      ...(subCategory === false && { parentId: null }),
    }),
    columns: [
      codeColumn<Category>(),
      recordColumn(),
      {
        key: 'parentId',
        cell: (row) => (row.parentId ? (parentName(row.parentId) ?? '—') : '—'),
        sortValue: (row) => (row.parentId ? parentName(row.parentId) : null),
      },
      { key: 'sortOrder', cell: (row) => row.sortOrder, sortValue: (row) => row.sortOrder },
      activeColumn<Category>(),
    ],
    fields: [
      { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
      // Most categories stand alone; the parent is asked only when this is one inside another.
      { name: 'subCategory', kind: 'switch', wide: true, defaultValue: false },
      {
        name: 'parentId',
        kind: 'select',
        optionsFrom: categoryChoices,
        showWhen: (values) => values.subCategory === true,
      },
      { name: 'nameNe', kind: 'text', required: true, max: 120 },
      { name: 'nameEn', kind: 'text', required: true, max: 120 },
      { name: 'nameRomanized', kind: 'text', max: 120 },
      { name: 'aliases', kind: 'tags', wide: true },
      { name: 'taxClassId', kind: 'select', optionsFrom: choices.taxClasses, editOnly: true },
      { name: 'sortOrder', kind: 'number', editOnly: true },
      { name: 'slug', kind: 'slug', max: 160, section: 'seo', wide: true },
      { name: 'metaTitle', kind: 'text', max: 70, wide: true },
      { name: 'metaDescription', kind: 'textarea', max: 160 },
      { name: 'isActive', kind: 'switch' },
    ],
  };
}

export const materialsResource: Resource<Material> = {
  key: 'materials',
  path: '/admin/materials',
  list: 'paged',
  rowId: (row) => row.id,
  rowLabel: (row) => `${row.code} · ${row.nameNe}`,
  initialSort: { key: 'code', direction: 'asc' },
  modalSize: 'lg',
  bulk: ['code', 'nameNe', 'nameEn', 'categoryId', 'defaultUnitId'],
  formRow: (row) => ({ ...row, categoryId: row.category.id, defaultUnitId: row.defaultUnit?.id }),
  columns: [
    codeColumn<Material>(),
    recordColumn(),
    {
      key: 'categoryId',
      cell: (row) => row.category.nameNe,
      sortValue: (row) => row.category.nameNe,
    },
    {
      key: 'defaultUnitId',
      cell: (row) => row.defaultUnit?.symbol ?? '—',
      sortValue: (row) => row.defaultUnit?.symbol,
    },
    {
      key: 'isSellable',
      cell: (row) => (row.isSellable ? <Badge tone="info">✓</Badge> : '—'),
      sortValue: (row) => row.isSellable,
    },
    activeColumn<Material>(),
  ],
  fields: [
    { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
    { name: 'categoryId', kind: 'select', required: true, optionsFrom: categoryChoices },
    { name: 'nameNe', kind: 'text', required: true, max: 160 },
    { name: 'nameEn', kind: 'text', required: true, max: 160 },
    { name: 'nameRomanized', kind: 'text', max: 160 },
    { name: 'defaultUnitId', kind: 'select', optionsFrom: choices.units },
    { name: 'aliases', kind: 'tags', wide: true },
    { name: 'specification', kind: 'textarea', max: 500 },
    { name: 'notes', kind: 'textarea', max: 1000 },
    { name: 'slug', kind: 'slug', max: 160, section: 'seo', wide: true },
    { name: 'metaTitle', kind: 'text', max: 70, wide: true },
    { name: 'metaDescription', kind: 'textarea', max: 160 },
    { name: 'isSellable', kind: 'switch' },
    { name: 'isComposite', kind: 'switch', defaultValue: false },
    { name: 'isActive', kind: 'switch' },
  ],
};

// Units sit under what they measure, in the order a shop thinks of them; inside each, smallest first
// (mg, g, kg …). A unit not named here goes after the named ones, by symbol.
const DIMENSION_ORDER = ['WEIGHT', 'LENGTH', 'VOLUME', 'AREA', 'COUNT'] as const;
const DIMENSION_NAME: Record<string, string> = {
  WEIGHT: 'Weight (mg, g, kg …)',
  LENGTH: 'Length (mm, cm, inch, ft, m …)',
  VOLUME: 'Volume (ml, L …)',
  AREA: 'Area (sq ft …)',
  COUNT: 'Count (pieces, pairs, sets …)',
};
const SIZE_ORDER = [
  'mg',
  'g',
  'gm',
  'kg',
  'quintal',
  'ton',
  'mm',
  'cm',
  'in',
  'inch',
  'ft',
  'foot',
  'yd',
  'm',
  'meter',
  'km',
  'ml',
  'l',
  'ltr',
  'litre',
  'sqft',
  'sq ft',
  'sqm',
  'pc',
  'pcs',
  'piece',
  'pair',
  'dozen',
  'set',
  'box',
  'packet',
  'bottle',
];
const sizeRank = (unit: Unit) => {
  const at = SIZE_ORDER.indexOf(unit.symbol.toLowerCase());
  return String(at === -1 ? 999 : at).padStart(3, '0') + unit.symbol.toLowerCase();
};
const loadUnits = async () =>
  (await request<{ items: Unit[] }>('GET', '/admin/units', { query: { limit: 100 } })).items;

export const unitsResource: Resource<Unit> = {
  key: 'units',
  path: '/admin/units',
  // All of them at once, so each heading shows its whole run of units.
  list: 'all',
  loadAll: loadUnits,
  matches: (row, q) =>
    `${row.code} ${row.symbol} ${row.nameNe} ${row.nameEn ?? ''}`.toLowerCase().includes(q),
  rowId: (row) => row.id,
  rowLabel: (row) => `${row.symbol} · ${row.nameNe}`,
  initialSort: { key: 'symbol', direction: 'asc' },
  groupBy: {
    of: (row) => row.dimension,
    label: (key) => DIMENSION_NAME[key] ?? key,
    order: DIMENSION_ORDER,
  },
  modalSize: 'sm',
  bulk: ['code', 'symbol', 'dimension', 'nameNe', 'nameEn'],
  columns: [
    codeColumn<Unit>(),
    { key: 'symbol', cell: (row) => row.symbol, sortValue: sizeRank },
    recordColumn(),
    activeColumn<Unit>(),
  ],
  fields: [
    { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
    { name: 'symbol', kind: 'text', required: true },
    {
      name: 'dimension',
      kind: 'select',
      required: true,
      defaultValue: 'COUNT',
      options: [
        { value: 'COUNT', label: 'Count (pieces, pairs, bottles)' },
        { value: 'WEIGHT', label: 'Weight (g, kg)' },
        { value: 'VOLUME', label: 'Volume (ml, L)' },
        { value: 'LENGTH', label: 'Length (cm, m)' },
        { value: 'AREA', label: 'Area (sq ft)' },
      ],
    },
    { name: 'nameNe', kind: 'text', required: true, max: 60 },
    { name: 'nameEn', kind: 'text', max: 60 },
    { name: 'isActive', kind: 'switch' },
  ],
};

export const sourcesResource: Resource<Source> = {
  key: 'sources',
  path: '/admin/sources',
  list: 'paged',
  rowId: (row) => row.id,
  rowLabel: (row) => `${row.code} · ${row.name}`,
  initialSort: { key: 'code', direction: 'asc' },
  bulk: ['code', 'name', 'topic', 'url'],
  columns: [
    codeColumn<Source>(),
    { key: 'name', cell: (row) => row.name, sortValue: (row) => row.name },
    { key: 'topic', cell: (row) => row.topic ?? '—', sortValue: (row) => row.topic },
    {
      key: 'url',
      cell: (row) =>
        row.url ? (
          <a
            href={row.url}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            {new URL(row.url).hostname}
          </a>
        ) : (
          '—'
        ),
    },
    activeColumn<Source>(),
  ],
  fields: [
    { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
    { name: 'name', kind: 'text', required: true, max: 160, wide: true },
    { name: 'topic', kind: 'text', max: 255, wide: true },
    { name: 'url', kind: 'url', wide: true },
    { name: 'note', kind: 'textarea', max: 1000 },
    { name: 'isActive', kind: 'switch' },
  ],
};

// The shop's brands, set up first and picked on an item (a new name typed on an item also lands here).
export const brandsResource: Resource<Brand> = {
  key: 'brands',
  path: '/admin/brands',
  list: 'paged',
  rowId: (row) => row.id,
  rowLabel: (row) => row.name,
  usagePath: undefined,
  initialSort: { key: 'name', direction: 'asc' },
  modalSize: 'sm',
  bulk: ['name', 'nameNe'],
  columns: [
    {
      key: 'name',
      cell: (row) => (
        <>
          <span className="font-semibold">{row.name}</span>
          {row.nameNe ? (
            <span className="ml-2 text-xs text-muted-foreground">{row.nameNe}</span>
          ) : null}
        </>
      ),
      sortValue: (row) => row.name,
      filterValue: (row) => `${row.name} ${row.nameNe ?? ''}`,
    },
    {
      key: 'itemCount',
      cell: (row) => <Badge>{row.itemCount}</Badge>,
      sortValue: (row) => row.itemCount,
      align: 'right',
    },
    activeColumn<Brand>(),
  ],
  fields: [
    { name: 'name', kind: 'text', required: true, max: 80 },
    { name: 'nameNe', kind: 'text', max: 80 },
    { name: 'isActive', kind: 'switch' },
  ],
};
