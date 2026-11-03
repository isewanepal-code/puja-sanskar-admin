import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SalesBookReport } from '@/features/reports';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/reports'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'reportsSection.tabs' });
  return { title: t('salesBook') };
}

export default async function SalesBookPage({ params }: PageProps<'/[locale]/reports'>) {
  await resolveLocale(params);
  return <SalesBookReport />;
}
