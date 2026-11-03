import { ActiveBadge, type Option, type Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { Thumb } from '@/components/media-library/thumb';

export type Product = Schema<'AdminProductResponse'>;
type Variant = Schema<'AdminVariantResponse'>;
type Grade = Schema<'ProductGradeResponse'>;
type Material = Schema<'AdminMaterialResponse'>;
type Unit = Schema<'UnitResponse'>;
type TaxClass = Schema<'TaxClassResponse'>;
type Page<T> = { items: T[] };

const money = (amount: string | null | undefined) => (amount ? formatMoney(amount, 'en') : '—');

// Sellable samagri only: a product is always one of them.
const materialChoices = {
  key: 'materials',
  load: async (): Promise<Option[]> =>
    (await request<Page<Material>>('GET', '/admin/materials', { query: { limit: 100 } })).items
      .filter((material) => material.isSellable)
      .map((material) => ({ value: material.id, label: `${material.code} · ${material.nameNe}` })),
};

const unitChoices = {
  key: 'units',
  load: async (): Promise<Option[]> =>
    (await request<Page<Unit>>('GET', '/admin/units', { query: { limit: 100 } })).items.map(
      (unit) => ({ value: unit.id, label: `${unit.symbol} · ${unit.nameNe}` }),
    ),
};

const taxClassChoices = {
  key: 'tax-classes',
  load: async (): Promise<Option[]> =>
    (await request<TaxClass[]>('GET', '/admin/tax-classes')).map((tax) => ({
      value: tax.id,
      label: `${tax.code} · ${tax.name}`,
    })),
};

export const productChoices = {
  key: 'products',
  load: async (): Promise<Option[]> =>
    (await request<Page<Product>>('GET', '/admin/products', { query: { limit: 100 } })).items.map(
      (product) => ({ value: product.id, label: `${product.code} · ${product.nameNe}` }),
    ),
};

export const productsResource: Resource<Product> = {
  key: 'products',
  path: '/admin/products',
  list: 'paged',
  rowId: (row) => row.id,
  rowLabel: (row) => `${row.code} · ${row.nameNe}`,
  initialSort: { key: 'code', direction: 'asc' },
  modalSize: 'lg',
  bulk: ['code', 'materialId', 'nameNe', 'nameEn'],
  formRow: (row) => ({ ...row, materialId: row.material.id }),
  columns: [
    {
      key: 'images',
      cell: (row) =>
        row.images[0] ? (
          <Thumb src={row.images[0].url} size={40} className="size-10" />
        ) : (
          <span className="block size-10 rounded-md bg-muted" />
        ),
    },
    {
      key: 'code',
      cell: (row) => <span className="font-semibold">{row.code}</span>,
      sortValue: (row) => row.code,
    },
    {
      key: 'nameNe',
      cell: (row) => (
        <>
          <div>{row.nameNe}</div>
          <div className="text-xs text-muted-foreground">{row.material.nameNe}</div>
        </>
      ),
      sortValue: (row) => row.nameNe,
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
    {
      key: 'isActive',
      cell: (row) => <ActiveBadge on={row.isActive} />,
      sortValue: (row) => row.isActive,
    },
  ],
  fields: [
    { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
    {
      name: 'materialId',
      kind: 'select',
      required: true,
      createOnly: true,
      optionsFrom: materialChoices,
    },
    { name: 'nameNe', kind: 'text', required: true, max: 160 },
    { name: 'nameEn', kind: 'text', required: true, max: 160 },
    { name: 'nameRomanized', kind: 'text', max: 160 },
    { name: 'taxClassId', kind: 'select', optionsFrom: taxClassChoices },
    { name: 'images', kind: 'images', section: 'website' },
    { name: 'description', kind: 'html', max: 4000 },
    { name: 'slug', kind: 'slug', max: 160, section: 'seo', wide: true },
    { name: 'isActive', kind: 'switch' },
  ],
};

const SKU = {
  regex: /^[A-Z0-9][A-Z0-9-]{1,39}$/,
  message: 'Capital letters, digits or -, such as KAP-050',
};
const QUANTITY = { regex: /^\d+(\.\d{1,3})?$/, message: 'An amount such as 50 or 0.5' };

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
      {
        key: 'isActive',
        cell: (row) => <ActiveBadge on={row.isActive} />,
        sortValue: (row) => row.isActive,
      },
    ],
    fields: [
      { name: 'sku', kind: 'code', required: true, pattern: SKU },
      { name: 'label', kind: 'text', required: true, max: 80 },
      { name: 'packQuantity', kind: 'number', pattern: QUANTITY },
      { name: 'packUnitId', kind: 'select', optionsFrom: unitChoices },
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
        optionsFrom: {
          key: `products-but-${product.id}`,
          load: async () =>
            (await productChoices.load()).filter((option) => option.value !== product.id),
        },
      },
    ],
  };
}
