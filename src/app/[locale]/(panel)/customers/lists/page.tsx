import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ListRequestsScreen } from '@/features/customers';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/customers/lists'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'customersSection.tabs' });
  return { title: t('lists') };
}

export default async function ListPhotosPage({ params }: PageProps<'/[locale]/customers/lists'>) {
  await resolveLocale(params);
  return <ListRequestsScreen />;
}
