import { request, type Schema } from '@/lib/api';

// One choice of a dropdown; `group` heads a run of choices, `detail` is shown muted after the label.
export type Choice = { value: string; label: string; detail?: string; group?: string };

// Where a dropdown's choices come from: a short list loaded whole and searched in the browser,
// or a long one the API searches a page at a time.
export type ChoiceSource =
  | { key: string; load: () => Promise<Choice[]> }
  | {
      key: string;
      search: (q: string, page: number) => Promise<{ choices: Choice[]; more: boolean }>;
      // The choice behind a saved value that is not on the first page.
      find?: (value: string) => Promise<Choice | null>;
    };

type Page<T> = { items: T[]; meta: { page: number; totalPages: number } };
type List<T> = { path: string; query?: Record<string, string>; toChoices: (row: T) => Choice[] };

export const PAGE_SIZE = 20;

// Between the steps of a path: parent › child.
export const PATH_SEPARATOR = ' › ';

async function pageOf<T>({ path, query, toChoices }: List<T>, q: string, page: number) {
  const { items, meta } = await request<Page<T>>('GET', path, {
    query: { ...query, q, page, limit: PAGE_SIZE },
  });
  return { choices: items.flatMap(toChoices), more: meta.page < meta.totalPages };
}

// A source over an admin list that takes q, page and limit.
export function pagedSource<T>(
  key: string,
  list: List<T> & { find?: (value: string) => string },
): ChoiceSource {
  return {
    key,
    search: (q, page) => pageOf(list, q, page),
    find: list.find
      ? async (value) => list.toChoices(await request<T>('GET', list.find!(value)))[0] ?? null
      : undefined,
  };
}

// Several lists searched together, each under its own heading: a kit, puja or product.
export function mergedSource(key: string, lists: List<never>[]): ChoiceSource {
  return {
    key,
    search: async (q, page) => {
      const pages = await Promise.all(lists.map((list) => pageOf(list, q, page)));
      return {
        choices: pages.flatMap((p) => p.choices),
        more: pages.some((p) => p.more),
      };
    },
  };
}

// A short list loaded whole.
export const wholeSource = (
  key: string,
  load: () => Promise<Choice[]>,
): Extract<ChoiceSource, { load: unknown }> => ({
  key,
  load,
});

type Material = Schema<'AdminMaterialResponse'>;
type Unit = Schema<'UnitResponse'>;
type TaxClass = Schema<'TaxClassResponse'>;
type Source = Schema<'SourceResponse'>;
type Product = Schema<'AdminProductResponse'>;
type Puja = Schema<'AdminPujaResponse'>;
type Mantra = Schema<'AdminMantraResponse'>;
type Supplier = Schema<'SupplierResponse'>;
type Festival = Schema<'AdminFestivalResponse'>;
type Kit = Schema<'AdminKitResponse'>;

const coded = (row: { id: string; code: string; nameNe: string }): Choice[] => [
  { value: row.id, label: `${row.nameNe}`, detail: row.code },
];

const packsOf = (product: Product): Choice[] =>
  product.variants.map((variant) => ({
    value: variant.id,
    label: `${product.nameNe} · ${variant.label}`,
    detail: variant.sku,
  }));

// The dropdowns many screens share, each written once.
export const choices = {
  materials: pagedSource<Material>('materials', {
    path: '/admin/materials',
    toChoices: coded,
    find: (id) => `/admin/materials/${id}`,
  }),
  sellableMaterials: pagedSource<Material>('materials-sellable', {
    path: '/admin/materials',
    toChoices: (m) => (m.isSellable ? coded(m) : []),
    find: (id) => `/admin/materials/${id}`,
  }),
  products: pagedSource<Product>('products', {
    path: '/admin/products',
    toChoices: coded,
    find: (id) => `/admin/products/${id}`,
  }),
  // Every pack of the products that match (by name, code or SKU), as "product · pack".
  packs: {
    key: 'packs',
    search: (q, page) => pageOf({ path: '/admin/products', toChoices: packsOf }, q, page),
    find: async (variantId) => {
      const { items } = await request<Page<Product>>('GET', '/admin/products', {
        query: { variantId, limit: 1 },
      });
      return items.flatMap(packsOf).find((pack) => pack.value === variantId) ?? null;
    },
  } satisfies ChoiceSource,
  pujas: pagedSource<Puja>('pujas', {
    path: '/admin/pujas',
    toChoices: coded,
    find: (id) => `/admin/pujas/${id}`,
  }),
  mantras: pagedSource<Mantra>('mantras', {
    path: '/admin/mantras',
    toChoices: coded,
    find: (id) => `/admin/mantras/${id}`,
  }),
  festivals: pagedSource<Festival>('festivals', {
    path: '/admin/festivals',
    toChoices: coded,
    find: (id) => `/admin/festivals/${id}`,
  }),
  kits: pagedSource<Kit>('kits', {
    path: '/admin/kits',
    toChoices: coded,
    find: (id) => `/admin/kits/${id}`,
  }),
  suppliers: pagedSource<Supplier>('suppliers', {
    path: '/admin/suppliers',
    toChoices: (s) => (s.isActive ? [{ value: s.id, label: s.name, detail: s.code }] : []),
    find: (id) => `/admin/suppliers/${id}`,
  }),
  units: wholeSource('units', async () =>
    (await request<Page<Unit>>('GET', '/admin/units', { query: { limit: 100 } })).items.map(
      (unit) => ({ value: unit.id, label: unit.nameNe, detail: unit.symbol }),
    ),
  ),
  sources: wholeSource('sources', async () =>
    (await request<Page<Source>>('GET', '/admin/sources', { query: { limit: 100 } })).items.map(
      (source) => ({ value: source.id, label: source.name, detail: source.code }),
    ),
  ),
  taxClasses: wholeSource('tax-classes', async () =>
    (await request<TaxClass[]>('GET', '/admin/tax-classes')).map((tax) => ({
      value: tax.id,
      label: tax.name,
      detail: tax.code,
    })),
  ),
};
