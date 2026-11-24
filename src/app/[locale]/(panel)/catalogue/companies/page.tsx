import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { CompaniesScreen } from '@/features/catalogue';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/catalogue/companies'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'catalogue.tabs' });
  return { title: t('companies') };
}

export default async function CompaniesPage({
  params,
}: PageProps<'/[locale]/catalogue/companies'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'catalogue' });
  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader title={t('tabs.companies')} intro={t('intro.companies')} />
      <CompaniesScreen />
    </div>
  );
}
