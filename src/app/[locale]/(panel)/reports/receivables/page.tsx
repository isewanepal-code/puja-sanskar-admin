import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ReceivablesReport } from '@/features/reports';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/reports/receivables'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'reportsSection.tabs' });
  return { title: t('receivables') };
}

export default async function ReceivablesPage({
  params,
}: PageProps<'/[locale]/reports/receivables'>) {
  await resolveLocale(params);
  return <ReceivablesReport />;
}
