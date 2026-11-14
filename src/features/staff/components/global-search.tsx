'use client';

import { useQuery } from '@tanstack/react-query';
import { Dialog } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { Icon, type IconName } from '@/components/icons';
import { searchPages } from '@/config/search-pages';
import { can } from '@/config/permissions';
import { request, type Schema } from '@/lib/api';
import { routes } from '@/lib/routes';

type Group = 'pages' | 'products' | 'kits' | 'pujas' | 'orders' | 'customers' | 'suppliers';

type Result = {
  id: string;
  group: Group;
  title: string;
  hint?: string;
  href: string;
  icon: IconName;
};

type Page<T> = { items: T[] };
type PageKey = Parameters<ReturnType<typeof useTranslations<'search'>>>[0];

const LIMIT = 5;
const ICONS: Record<Group, IconName> = {
  pages: 'grid',
  products: 'leaf',
  kits: 'gift',
  pujas: 'temple',
  orders: 'box',
  customers: 'user',
  suppliers: 'truck',
};

// Where a record opens: its list, filtered to it, with its form already open.
const open = (path: string, id: string, find: string) =>
  `${path}?${new URLSearchParams({ open: id, q: find })}`;

async function find(query: string, granted: readonly string[]): Promise<Result[]> {
  const ask = <T,>(path: string, allowed: boolean) =>
    allowed
      ? request<Page<T>>('GET', path, { query: { q: query, limit: LIMIT } }).then(
          (page) => page.items,
          () => [] as T[],
        )
      : Promise.resolve([] as T[]);
  const catalogue = can(granted, 'catalogue:read');

  const [products, kits, pujas, orders, customers, suppliers] = await Promise.all([
    ask<Schema<'AdminProductResponse'>>('/admin/products', catalogue),
    ask<Schema<'AdminKitResponse'>>('/admin/kits', catalogue),
    ask<Schema<'AdminPujaResponse'>>('/admin/pujas', catalogue),
    ask<Schema<'AdminOrderResponse'>>('/admin/orders', can(granted, 'orders:read')),
    ask<Schema<'CustomerResponse'>>('/admin/customers', can(granted, 'customers:read')),
    ask<Schema<'SupplierResponse'>>('/admin/suppliers', can(granted, 'purchases:read')),
  ]);

  return [
    ...products.map((row) => ({
      id: `p-${row.id}`,
      group: 'products' as const,
      title: row.nameEn,
      hint: `${row.code} · ${row.nameNe}`,
      href: open(routes.products(), row.id, row.code),
      icon: ICONS.products,
    })),
    ...kits.map((row) => ({
      id: `k-${row.id}`,
      group: 'kits' as const,
      title: row.nameEn,
      hint: [row.code, row.puja?.nameEn, row.tier?.toLowerCase()].filter(Boolean).join(' · '),
      href: open(routes.kits(), row.id, row.code),
      icon: ICONS.kits,
    })),
    ...pujas.map((row) => ({
      id: `j-${row.id}`,
      group: 'pujas' as const,
      title: row.nameEn,
      hint: row.nameNe,
      href: open(routes.pujas(), row.id, row.nameEn),
      icon: ICONS.pujas,
    })),
    ...orders.map((row) => ({
      id: `o-${row.id}`,
      group: 'orders' as const,
      title: row.number,
      hint: row.status,
      href: routes.order(row.id),
      icon: ICONS.orders,
    })),
    ...customers.map((row) => ({
      id: `c-${row.id}`,
      group: 'customers' as const,
      title: row.fullName,
      hint: row.email,
      href: open(routes.customers(), row.id, row.email),
      icon: ICONS.customers,
    })),
    ...suppliers.map((row) => ({
      id: `s-${row.id}`,
      group: 'suppliers' as const,
      title: row.name,
      hint: row.code,
      href: open(routes.suppliers(), row.id, row.code),
      icon: ICONS.suppliers,
    })),
  ];
}

// One box that finds any page of the panel, and any item, kit, puja, order, customer or supplier
// by name or code, and opens it. Ctrl+K (or ⌘K) opens it from anywhere.
export function GlobalSearch({ permissions }: { permissions: readonly string[] }) {
  const t = useTranslations('search');
  const router = useRouter();
  const [shown, setShown] = useState(false);
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const query = useDeferredValue(text.trim());

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShown((value) => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pages = useMemo<Result[]>(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    return searchPages
      .filter((page) => can(permissions, page.permission))
      .map((page) => ({
        page,
        label: t(`pages.${page.id}` as PageKey),
        group: t(`pageGroups.${page.id}` as PageKey),
      }))
      .filter(({ page, label, group }) => {
        const haystack = `${label} ${group} ${page.keywords}`.toLowerCase();
        return words.every((word) => haystack.includes(word));
      })
      .slice(0, 8)
      .map(({ page, label, group }) => ({
        id: `page-${page.id}`,
        group: 'pages' as const,
        title: label,
        hint: group,
        href: page.href,
        icon: ICONS.pages,
      }));
  }, [query, permissions, t]);

  const records = useQuery({
    queryKey: ['global-search', query],
    queryFn: () => find(query, permissions),
    enabled: shown && query.length >= 2,
    staleTime: 15_000,
  });

  const results = [...pages, ...(records.data ?? [])];
  const current = Math.min(active, Math.max(0, results.length - 1));

  const go = (result: Result | undefined) => {
    if (!result) return;
    setShown(false);
    router.push(result.href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current + step + results.length) % Math.max(1, results.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[current]);
    }
  };

  const groups = (
    ['pages', 'products', 'kits', 'pujas', 'orders', 'customers', 'suppliers'] as const
  )
    .map((group) => ({ group, items: results.filter((result) => result.group === group) }))
    .filter(({ items }) => items.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setShown(true)}
        aria-label={t('open')}
        className="flex h-9 items-center gap-2 rounded-md bg-muted px-3 text-sm text-muted-foreground transition-colors hover:text-foreground sm:w-64"
      >
        <Icon name="search" size={16} />
        <span className="hidden flex-1 text-left sm:block">{t('hint')}</span>
        <kbd className="hidden rounded bg-card px-1.5 py-0.5 text-[11px] sm:block">Ctrl K</kbd>
      </button>

      <Dialog.Root
        open={shown}
        onOpenChange={(value) => {
          setShown(value);
          if (!value) {
            setText('');
            setActive(0);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Popup
            initialFocus={input}
            className="fixed top-[12vh] left-1/2 z-50 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl bg-card shadow-2xl ring-1 ring-border"
          >
            <Dialog.Title className="sr-only">{t('title')}</Dialog.Title>
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Icon name="search" size={18} className="text-muted-foreground" />
              <input
                ref={input}
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={t('placeholder')}
                aria-label={t('placeholder')}
                className="h-12 w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className="max-h-[56vh] overflow-y-auto p-2">
              {query.length < 2 && pages.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t('start')}</p>
              ) : results.length === 0 && !records.isFetching ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {t('empty', { query })}
                </p>
              ) : (
                groups.map(({ group, items }) => (
                  <div key={group} className="mb-2">
                    <div className="px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {t(`groups.${group}`)}
                    </div>
                    {items.map((result) => {
                      const index = results.indexOf(result);
                      return (
                        <button
                          key={result.id}
                          type="button"
                          onMouseMove={() => setActive(index)}
                          onClick={() => go(result)}
                          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                            index === current ? 'bg-muted' : ''
                          }`}
                        >
                          <Icon
                            name={result.icon}
                            size={16}
                            className="shrink-0 text-muted-foreground"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{result.title}</span>
                            {result.hint ? (
                              <span className="block truncate text-xs text-muted-foreground">
                                {result.hint}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
