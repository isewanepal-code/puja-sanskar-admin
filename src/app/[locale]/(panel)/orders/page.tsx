import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/feedback';
import { Pagination } from '@/components/navigation';
import { isOrderStatus, listOrders, ORDER_STATUSES, OrdersTable } from '@/features/orders';
import { Link } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/server';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/orders'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'orders' });
  return { title: t('title') };
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function OrdersPage({ params, searchParams }: PageProps<'/[locale]/orders'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'orders' });
  const query = await searchParams;
  const rawStatus = one(query.status);
  const status = isOrderStatus(rawStatus) ? rawStatus : undefined;
  const q = one(query.q)?.trim() || undefined;
  const page = Math.max(1, Number(one(query.page)) || 1);

  const { items, meta } = await listOrders({ page, status, q });
  // Filters live in the URL, so a status tab keeps the search and starts again at page one.
  const tabHref = (next?: string) => {
    const search = new URLSearchParams(
      Object.entries({ status: next, q }).filter((e): e is [string, string] => !!e[1]),
    ).toString();
    return search ? `${routes.orders()}?${search}` : routes.orders();
  };

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('count', { total: meta.total })}</p>
        </div>
        <form action={routes.orders()} className="flex w-full gap-2 sm:w-auto">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t('search')}
            aria-label={t('search')}
            className="input sm:w-72"
          />
          <button type="submit" className="btn btn-primary">
            {t('searchButton')}
          </button>
        </form>
      </header>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {[undefined, ...ORDER_STATUSES].map((value) => (
          <Link
            key={value ?? 'all'}
            href={tabHref(value)}
            aria-current={value === status ? 'page' : undefined}
            className={cn('chip whitespace-nowrap', value === status && 'chip-solid')}
          >
            {value ? t(`status.${value}`) : t('all')}
          </Link>
        ))}
      </nav>

      {items.length > 0 ? (
        <OrdersTable orders={items} />
      ) : (
        <EmptyState title={t('empty')} description={t('emptyHint')} icon="box" />
      )}

      <Pagination
        locale={locale}
        page={meta.page}
        totalPages={meta.totalPages}
        pathname={routes.orders()}
        query={{ status, q }}
      />
    </div>
  );
}
