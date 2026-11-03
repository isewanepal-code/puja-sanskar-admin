import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/feedback';
import { listRitualTypes, RitualTypesTable } from '@/features/puja-groups';
import { Link } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/server';
import { routes } from '@/lib/routes';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/pujas/ritual-types'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.tabs' });
  return { title: t('ritualTypes') };
}

export default async function RitualTypesPage({
  params,
}: PageProps<'/[locale]/pujas/ritual-types'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.ritualTypes' });
  const ritualTypes = await listRitualTypes();

  return (
    <div className="grid gap-5">
      <div>
        <Link href={routes.newRitualType()} className="btn btn-primary">
          {t('add')}
        </Link>
      </div>
      {ritualTypes.length > 0 ? (
        <RitualTypesTable ritualTypes={ritualTypes} />
      ) : (
        <EmptyState title={t('empty')} icon="tag" />
      )}
    </div>
  );
}
