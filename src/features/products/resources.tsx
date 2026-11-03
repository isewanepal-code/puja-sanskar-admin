import { activeColumn, recordColumn, type Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { type Schema } from '@/lib/api';
import { choices, pagedSource } from '@/lib/choices';
import { formatMoney } from '@/lib/format';
import { categoryChoices } from '@/features/catalogue';

export type Product = Schema<'AdminProductResponse'>;
type Variant = Schema<'AdminVariantResponse'>;
type Grade = Schema<'ProductGradeResponse'>;

const money = (amount: string | null | undefined) => (amount ? formatMoney(amount, 'en') : '—');

const HS_CODE = { regex: /^\d{4,8}$/, message: '4 to 8 digits, such as 33074100' };

export const productsResource: Resource<Product> = {
  key: 'products',
  path: '/admin/products',
  exportPath: '/admin/products/export',
  list: 'paged',
  // Newest first, as the shop adds them; a heading still sorts the page.
  listQuery: { sort: 'NEWEST' },
  // A new item comes through the one-step form (quickItemResource); this form edits.
  canCreate: false,
  rowId: (row) => row.id,
  rowLabel: (row) => `${row.code} · ${row.nameNe}`,
  modalSize: 'lg',
  formRow: (row) => ({ ...row, materialId: row.material.id }),
  columns: [
    recordColumn<Product>('item', {
      image: (row) => row.images[0]?.url,
      code: (row) => row.code,
    }),
    {
      key: 'tags',
      cell: (row) =>
        row.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        ) : (
          '—'
        ),
      filterValue: (row) => row.tags.join(' '),
    },
    {
      key: 'variants',
      cell: (row) => <Badge>{row.variants.length}</Badge>,
      sortValue: (row) => row.variants.length,
      align: 'right',
    },
    {
      key: 'fromPrice',
      cell: (row) => money(row.fromPrice),
      sortValue: (row) => Number(row.fromPrice ?? -1),
      align: 'right',
    },
    activeColumn(),
  ],
  fields: [
    { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
    {
      name: 'materialId',
      kind: 'select',
      required: true,
      createOnly: true,
      optionsFrom: choices.sellableMaterials,
    },
    { name: 'nameNe', kind: 'text', required: true, max: 160 },
    { name: 'nameEn', kind: 'text', required: true, max: 160 },
    { name: 'nameRomanized', kind: 'text', max: 160 },
    { name: 'taxClassId', kind: 'select', optionsFrom: choices.taxClasses },
    { name: 'hsCode', kind: 'text', max: 8, pattern: HS_CODE },
    { name: 'tags', kind: 'tags', wide: true },
    { name: 'images', kind: 'images', section: 'website' },
    { name: 'description', kind: 'html', max: 4000 },
    { name: 'slug', kind: 'slug', max: 160, section: 'seo', wide: true },
    { name: 'metaTitle', kind: 'text', max: 70, wide: true },
    { name: 'metaDescription', kind: 'textarea', max: 160 },
    { name: 'isActive', kind: 'switch' },
  ],
};

const SKU = {
  regex: /^[A-Z0-9][A-Z0-9-]{1,39}$/,
  message: 'Capital letters, digits or -, such as KAP-050',
};
const QUANTITY = { regex: /^\d+(\.\d{1,3})?$/, message: 'An amount such as 50 or 0.5' };

const plain = (text: string) =>
  text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

// A code from the English name when staff leave it empty: "Loban dhup" → LOBAN_DHUP.
export function codeFrom(nameEn: string): string {
  const code = plain(nameEn).slice(0, 32).replace(/_+$/, '');
  return /^[A-Z]/.test(code) ? code : `I_${code}`.slice(0, 32);
}

// A pack's SKU from the item's code and its label: LOBAN_DHUP and "50 g" → LOBAN-DHUP-50G.
export function skuFrom(code: string, packLabel: string): string {
  const pack = plain(packLabel).replaceAll('_', '').slice(0, 8);
  return [code.replaceAll('_', '-').slice(0, 30), pack].filter(Boolean).join('-');
}

// One form for a new item: its names, one pack and price, and the stock that came in.
// The samagri is made behind it in the chosen category unless an existing one is picked.
export const quickItemResource: Resource<never> = {
  key: 'quickItem',
  scope: 'products',
  path: '/admin/items',
  // Required columns always show in "Add many"; the rest staff turn on as they need them.
  bulk: [
    'nameNe',
    'nameEn',
    'packLabel',
    'price',
    'categoryId',
    'openingQuantity',
    'openingUnitCost',
    'hsCode',
    'tags',
    'materialId',
    'compareAtPrice',
    'code',
    'sku',
  ],
  list: 'all',
  rowId: () => '',
  rowLabel: () => '',
  columns: [],
  check: (values) =>
    values.materialId || values.categoryId
      ? null
      : { field: 'categoryId', message: 'Pick a category, or an existing samagri' },
  shapeBody: ({ openingQuantity, openingUnitCost, openingDay, ...body }) => {
    const code = (body.code as string | null) || codeFrom(String(body.nameEn));
    return {
      ...body,
      code,
      sku: (body.sku as string | null) || skuFrom(code, String(body.packLabel)),
      materialId: body.materialId ?? undefined,
      categoryId: body.categoryId ?? undefined,
      openingStock:
        typeof openingQuantity === 'number'
          ? { quantity: openingQuantity, unitCost: openingUnitCost, day: openingDay ?? undefined }
          : undefined,
    };
  },
  fields: [
    { name: 'nameNe', kind: 'text', required: true, max: 160 },
    { name: 'nameEn', kind: 'text', required: true, max: 160 },
    { name: 'categoryId', kind: 'select', optionsFrom: categoryChoices },
    { name: 'materialId', kind: 'select', optionsFrom: choices.sellableMaterials },
    { name: 'packLabel', kind: 'text', required: true, max: 80, section: 'pack' },
    { name: 'packQuantity', kind: 'number', pattern: QUANTITY },
    { name: 'packUnitId', kind: 'select', optionsFrom: choices.units },
    { name: 'price', kind: 'money', required: true },
    { name: 'compareAtPrice', kind: 'money' },
    { name: 'openingQuantity', kind: 'number', section: 'stock' },
    { name: 'openingUnitCost', kind: 'money' },
    { name: 'openingDay', kind: 'date' },
    { name: 'hsCode', kind: 'text', max: 8, pattern: HS_CODE, section: 'more' },
    { name: 'tags', kind: 'tags' },
    { name: 'description', kind: 'textarea', max: 4000, wide: true },
    { name: 'showOnWebsite', kind: 'switch' },
    { name: 'code', kind: 'code', max: 32 },
    { name: 'sku', kind: 'code', max: 40, pattern: SKU },
  ],
};

// A product's packs: each its own SKU, price and stock.
export function variantsResource(product: Product): Resource<Variant> {
  const gradeName = new Map(product.grades.map((grade) => [grade.id, grade.nameNe]));
  return {
    key: 'variants',
    scope: 'products',
    path: `/admin/products/${product.id}/variants`,
    list: 'all',
    rowId: (row) => row.id,
    rowLabel: (row) => `${row.sku} · ${row.label}`,
    matches: (row, q) => `${row.sku} ${row.label}`.toLowerCase().includes(q),
    initialSort: { key: 'price', direction: 'asc' },
    bulk: ['sku', 'label', 'packQuantity', 'packUnitId', 'price'],
    formRow: (row) => ({ ...row, packQuantity: row.pack?.quantity, packUnitId: row.pack?.unit.id }),
    columns: [
      {
        key: 'sku',
        cell: (row) => <span className="font-semibold">{row.sku}</span>,
        sortValue: (row) => row.sku,
      },
      {
        key: 'label',
        cell: (row) => (
          <>
            {row.label}
            {row.isDefault ? (
              <Badge tone="info" className="ml-2">
                ★
              </Badge>
            ) : null}
          </>
        ),
        sortValue: (row) => row.label,
      },
      {
        key: 'packQuantity',
        cell: (row) => (row.pack ? `${row.pack.quantity} ${row.pack.unit.symbol}` : '—'),
        sortValue: (row) => row.pack?.quantity,
      },
      {
        key: 'gradeId',
        cell: (row) => (row.gradeId ? (gradeName.get(row.gradeId) ?? '—') : '—'),
        sortValue: (row) => (row.gradeId ? gradeName.get(row.gradeId) : null),
      },
      {
        key: 'price',
        cell: (row) => money(row.price),
        sortValue: (row) => Number(row.price),
        align: 'right',
      },
      {
        key: 'compareAtPrice',
        cell: (row) => (
          <span className="text-muted-foreground line-through">{money(row.compareAtPrice)}</span>
        ),
        sortValue: (row) => Number(row.compareAtPrice ?? -1),
        align: 'right',
      },
      {
        key: 'inStock',
        cell: (row) => (
          <Badge tone={row.inStock ? 'success' : 'warning'}>{row.inStock ? '✓' : '0'}</Badge>
        ),
        sortValue: (row) => row.inStock,
      },
      activeColumn(),
    ],
    fields: [
      { name: 'sku', kind: 'code', required: true, pattern: SKU },
      { name: 'label', kind: 'text', required: true, max: 80 },
      { name: 'packQuantity', kind: 'number', pattern: QUANTITY },
      { name: 'packUnitId', kind: 'select', optionsFrom: choices.units },
      {
        name: 'gradeId',
        kind: 'select',
        options: product.grades.map((grade: Grade) => ({ value: grade.id, label: grade.nameNe })),
      },
      { name: 'price', kind: 'money', required: true },
      { name: 'compareAtPrice', kind: 'money' },
      { name: 'pricesIncludeTax', kind: 'switch' },
      { name: 'isActive', kind: 'switch' },
    ],
  };
}

// A product's grades, such as साधारण and विशेष, which packs then name.
export function gradesResource(product: Product): Resource<Grade> {
  return {
    key: 'grades',
    scope: 'products',
    path: `/admin/products/${product.id}/grades`,
    list: 'all',
    rowId: (row) => row.id,
    rowLabel: (row) => row.nameNe,
    initialSort: { key: 'sortOrder', direction: 'asc' },
    modalSize: 'sm',
    bulk: ['nameNe', 'nameEn'],
    columns: [
      {
        key: 'nameNe',
        cell: (row) => (
          <>
            <div>{row.nameNe}</div>
            <div className="text-xs text-muted-foreground">{row.nameEn}</div>
          </>
        ),
        sortValue: (row) => row.nameNe,
      },
      { key: 'noteNe', cell: (row) => row.noteNe ?? '—' },
      { key: 'sortOrder', cell: (row) => row.sortOrder, sortValue: (row) => row.sortOrder },
    ],
    fields: [
      { name: 'nameNe', kind: 'text', required: true, max: 80 },
      { name: 'nameEn', kind: 'text', required: true, max: 80 },
      { name: 'noteNe', kind: 'text', max: 200, wide: true },
      { name: 'noteEn', kind: 'text', max: 200, wide: true },
    ],
  };
}

// The products shown as "goes well with"; the list sent replaces the old one.
export function pairingsResource(product: Product): Resource<never> {
  return {
    key: 'pairings',
    scope: 'products',
    path: `/admin/products/${product.id}/pairings`,
    submitMethod: 'PUT',
    list: 'all',
    rowId: () => '',
    rowLabel: () => product.nameNe,
    columns: [],
    fields: [
      {
        name: 'productIds',
        kind: 'multiselect',
        optionsFrom: pagedSource<Product>(`products-but-${product.id}`, {
          path: '/admin/products',
          toChoices: (other) =>
            other.id === product.id
              ? []
              : [{ value: other.id, label: other.nameNe, detail: other.code }],
          find: (id) => `/admin/products/${id}`,
        }),
      },
    ],
  };
}
