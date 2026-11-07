'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, type RefObject } from 'react';

import { Icon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/input';
import { isApiError, request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

import type { Pack } from './types';

type Shelf = Schema<'ShelfItemResponse'>;
type Kit = Schema<'AdminKitResponse'>;
type Page<T> = { items: T[]; meta: { page: number; totalPages: number } };
type Tab = 'kits' | 'items';

const LIMIT = 24;

// A short pause after typing before the API is asked.
function useDebounced(value: string, ms = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

function usePaged<T>(
  path: string,
  q: string,
  enabled: boolean,
  extra: Record<string, unknown> = {},
) {
  return useInfiniteQuery({
    queryKey: ['counter', path, q],
    queryFn: ({ pageParam }) =>
      request<Page<T>>('GET', path, {
        query: { q: q || undefined, page: pageParam, limit: LIMIT, ...extra },
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    enabled,
  });
}

const kitPack = (kit: Kit): Pack => ({
  id: kit.id,
  kind: 'kit',
  name: kit.nameNe,
  detail: kit.nameEn,
  code: kit.code,
  price: kit.salePrice,
  listPrice: kit.salePrice !== kit.price ? kit.price : undefined,
  image: kit.images[0]?.url,
  available: kit.availableCount,
});

// What stops a kit being sold here: the items it holds that this branch cannot cover.
const lacking = (kit: Kit) =>
  kit.items
    .filter((item) => !item.isOptional && item.available < item.quantity)
    .map((item) => `${item.product.nameEn} ${item.sku.label} (${item.available}/${item.quantity})`);

const packsOf = (item: Shelf): Pack[] =>
  item.packs.map((pack) => ({
    id: pack.variantId,
    kind: 'pack' as const,
    name: item.nameNe,
    detail: `${pack.label} · ${item.nameEn}`,
    code: pack.sku,
    price: pack.price,
    image: item.imageUrl ?? undefined,
    available: pack.available,
  }));

type CataloguePanelProps = {
  onAdd: (pack: Pack) => void;
  searchRef: RefObject<HTMLInputElement | null>;
};

// The shelf: kits and items to tap onto the sale, found by typing or by scanning a SKU.
export function CataloguePanel({ onAdd, searchRef }: CataloguePanelProps) {
  const t = useTranslations('counterSale');
  const [tab, setTab] = useState<Tab>('kits');
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());
  // Kits that cannot be made from this branch's shelf stay out of the way unless asked for.
  const [showShort, setShowShort] = useState(false);
  const kitsQuery = usePaged<Kit>('/admin/kits', q, tab === 'kits', { isActive: true });
  const itemsQuery = usePaged<Shelf>('/admin/store-sales/items', q, tab === 'items');
  const query = tab === 'kits' ? kitsQuery : itemsQuery;

  const allKits = useMemo(
    () => kitsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [kitsQuery.data],
  );
  const shortKits = allKits.filter((kit) => kit.availableCount <= 0).length;
  const kits = showShort ? allKits : allKits.filter((kit) => kit.availableCount > 0);
  const products = useMemo(
    () => itemsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [itemsQuery.data],
  );

  // Enter adds the exact SKU typed, or the only thing left on the shelf.
  function enter() {
    const wanted = text.trim().toLowerCase();
    if (!wanted) return;
    const packs = products.flatMap(packsOf).filter((pack) => pack.available > 0);
    const exact = packs.find((pack) => pack.code.toLowerCase() === wanted);
    if (exact) {
      onAdd(exact);
      setText('');
      return;
    }
    if (tab === 'items' && packs.length === 1) onAdd(packs[0]!);
    if (tab === 'kits' && kits.length === 1) onAdd(kitPack(kits[0]!));
  }

  const empty =
    !query.isPending &&
    !query.isError &&
    (tab === 'kits' ? kits.length === 0 : products.length === 0);

  return (
    <section className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                enter();
              }
              if (event.key === 'Escape') setText('');
            }}
            placeholder={t('search')}
            aria-label={t('search')}
            autoFocus
            className="h-12 w-full rounded-xl border border-border bg-card pr-14 pl-10 text-base transition-colors outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-border px-1.5 text-xs text-muted-foreground">
            /
          </kbd>
        </div>
        <div className="inline-flex rounded-xl bg-muted p-1" role="tablist" aria-label={t('shelf')}>
          {(['kits', 'items'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                tab === value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(value === 'kits' ? 'tabKits' : 'tabItems')}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {tab === 'kits' && !query.isPending ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <Switch
              label={t('showShort')}
              checked={showShort}
              onChange={(event) => setShowShort(event.target.checked)}
            />
            {!showShort && shortKits > 0 ? (
              <span className="text-xs text-muted-foreground">
                {t('shortHidden', { count: shortKits })}
              </span>
            ) : null}
          </div>
        ) : null}
        {query.isPending ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t('loading')}</p>
        ) : query.isError ? (
          <p role="alert" className="py-10 text-center text-sm text-destructive">
            {isApiError(query.error) ? query.error.message : t('loadFailed')}
          </p>
        ) : empty ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t('noResults')}</p>
        ) : tab === 'kits' ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
            {kits.map((kit) => {
              const pack = kitPack(kit);
              const short = kit.availableCount <= 0;
              const missing = short ? lacking(kit) : [];
              return (
                <li key={kit.id}>
                  <button
                    type="button"
                    disabled={short}
                    onClick={() => onAdd(pack)}
                    className="group grid h-full w-full content-start gap-2 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Tile image={pack.image} name={pack.name} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{pack.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {kit.tier ? `${t(`tiers.${kit.tier}`)} · ` : ''}
                        {t('itemsIn', { count: kit.items.length })}
                      </div>
                      {missing.length > 0 ? (
                        <div className="mt-1 text-xs text-destructive">
                          {t('needs', { items: missing.slice(0, 2).join(', ') })}
                          {missing.length > 2 ? ` +${missing.length - 2}` : ''}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <div className="font-heading text-lg font-semibold tabular-nums">
                          {formatMoney(pack.price, 'en')}
                        </div>
                        {pack.listPrice ? (
                          <div className="text-xs text-muted-foreground line-through">
                            {formatMoney(pack.listPrice, 'en')}
                          </div>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          short
                            ? 'bg-destructive/10 text-destructive'
                            : kit.availableCount <= 3
                              ? 'bg-warning/15 text-warning'
                              : 'bg-success/12 text-success',
                        )}
                      >
                        {short ? t('short') : t('left', { count: kit.availableCount })}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
            {products.map((item) => {
              const packs = packsOf(item);
              return (
                <li
                  key={item.id}
                  className="grid content-start gap-2 rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <Tile image={item.imageUrl ?? undefined} name={item.nameNe} small />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{item.nameNe}</div>
                      <div className="truncate text-xs text-muted-foreground">{item.nameEn}</div>
                    </div>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {packs.map((pack) => (
                      <li key={pack.id}>
                        <button
                          type="button"
                          disabled={pack.available <= 0}
                          onClick={() => onAdd(pack)}
                          title={pack.code}
                          className="grid min-w-24 rounded-lg border border-border px-3 py-1.5 text-left transition-all hover:border-primary hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <span className="text-sm font-medium">{pack.detail.split(' · ')[0]}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatMoney(pack.price, 'en')}
                          </span>
                          <span
                            className={cn(
                              'text-xs font-semibold',
                              pack.available <= 0
                                ? 'text-destructive'
                                : pack.available <= 3
                                  ? 'text-warning'
                                  : 'text-success',
                            )}
                          >
                            {pack.available <= 0
                              ? t('outOfStock')
                              : t('left', { count: pack.available })}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
        {query.hasNextPage ? (
          <div className="py-4 text-center">
            <Button
              variant="secondary"
              disabled={query.isFetchingNextPage}
              onClick={() => query.fetchNextPage()}
            >
              {t('loadMore')}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Tile({ image, name, small }: { image?: string; name: string; small?: boolean }) {
  const size = small ? 'size-12' : 'aspect-[16/9] w-full';
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element -- an uploaded photo, already resized by the API
    <img src={image} alt="" className={cn(size, 'shrink-0 rounded-lg bg-muted object-cover')} />
  ) : (
    <div
      className={cn(
        size,
        'grid shrink-0 place-items-center rounded-lg bg-primary/8 font-heading text-xl font-semibold text-primary',
      )}
      aria-hidden="true"
    >
      {[...name][0]}
    </div>
  );
}
