import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { VatReport } from '@/features/reports';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/reports/vat'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'reportsSection.tabs' });
  return { title: t('vat') };
}

export default async function VatPage({ params }: PageProps<'/[locale]/reports/vat'>) {
  await resolveLocale(params);
  return <VatReport />;
}
