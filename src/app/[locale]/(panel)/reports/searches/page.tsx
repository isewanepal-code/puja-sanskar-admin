import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SearchTermsReport } from '@/features/reports';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/reports/searches'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'reportsSection.tabs' });
  return { title: t('searches') };
}

export default async function SearchTermsPage({ params }: PageProps<'/[locale]/reports/searches'>) {
  await resolveLocale(params);
  return <SearchTermsReport />;
}
