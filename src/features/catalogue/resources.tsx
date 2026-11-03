import { activeColumn, codeColumn, recordColumn, type Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { request, type Schema } from '@/lib/api';
import { choices, wholeSource } from '@/lib/choices';

type Category = Schema<'AdminCategoryResponse'>;
type CategoryNode = Category & { children: CategoryNode[] };
type Material = Schema<'AdminMaterialResponse'>;
type Unit = Schema<'UnitResponse'>;
type Source = Schema<'SourceResponse'>;

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
      { name: 'parentId', kind: 'select', optionsFrom: categoryChoices },
      { name: 'nameNe', kind: 'text', required: true, max: 120 },
      { name: 'nameEn', kind: 'text', required: true, max: 120 },
      { name: 'nameRomanized', kind: 'text', max: 120 },
      { name: 'taxClassId', kind: 'select', optionsFrom: choices.taxClasses },
      { name: 'sortOrder', kind: 'number' },
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

export const unitsResource: Resource<Unit> = {
  key: 'units',
  path: '/admin/units',
  list: 'paged',
  rowId: (row) => row.id,
  rowLabel: (row) => `${row.symbol} · ${row.nameNe}`,
  initialSort: { key: 'code', direction: 'asc' },
  modalSize: 'sm',
  bulk: ['code', 'symbol', 'nameNe', 'nameEn'],
  columns: [
    codeColumn<Unit>(),
    { key: 'symbol', cell: (row) => row.symbol, sortValue: (row) => row.symbol },
    recordColumn(),
    activeColumn<Unit>(),
  ],
  fields: [
    { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
    { name: 'symbol', kind: 'text', required: true },
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
