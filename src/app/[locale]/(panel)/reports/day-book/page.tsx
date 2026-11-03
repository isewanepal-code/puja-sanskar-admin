import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { DayBookReport } from '@/features/reports';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/reports/day-book'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'reportsSection.tabs' });
  return { title: t('dayBook') };
}

export default async function DayBookPage({ params }: PageProps<'/[locale]/reports/day-book'>) {
  await resolveLocale(params);
  return <DayBookReport />;
}
