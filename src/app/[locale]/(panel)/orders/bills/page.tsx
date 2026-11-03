import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { BillsScreen } from '@/features/sales';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/orders/bills'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'salesSection.tabs' });
  return { title: t('bills') };
}

export default async function BillsPage({ params }: PageProps<'/[locale]/orders/bills'>) {
  await resolveLocale(params);
  return <BillsScreen />;
}
