import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/feedback';
import { Pagination } from '@/components/navigation';
import { getCatalogue, groupOptions } from '@/features/puja-groups';
import { listPujas, PujasTable } from '@/features/pujas';
import { Link } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/server';
import { routes } from '@/lib/routes';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/pujas/list'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.tabs' });
  return { title: t('list') };
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function PujasPage({
  params,
  searchParams,
}: PageProps<'/[locale]/pujas/list'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.list' });
  const query = await searchParams;
  const q = one(query.q)?.trim() || undefined;
  const page = Math.max(1, Number(one(query.page)) || 1);

  const [{ items, meta }, catalogue] = await Promise.all([listPujas({ page, q }), getCatalogue()]);
  const groupLabels = new Map(groupOptions(catalogue.groups).map((g) => [g.id, g.label]));

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form action={routes.pujas()} className="flex w-full gap-2 sm:w-auto">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t('search')}
            aria-label={t('search')}
            className="input sm:w-72"
          />
          <button type="submit" className="btn btn-outline">
            {t('searchButton')}
          </button>
        </form>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{t('count', { total: meta.total })}</span>
          <Link href={routes.newPuja()} className="btn btn-primary">
            {t('add')}
          </Link>
        </div>
      </div>

      {items.length > 0 ? (
        <PujasTable pujas={items} groupLabels={groupLabels} />
      ) : (
        <EmptyState title={t('empty')} icon="temple" />
      )}

      <Pagination
        locale={locale}
        page={meta.page}
        totalPages={meta.totalPages}
        pathname={routes.pujas()}
        query={{ q }}
      />
    </div>
  );
}
