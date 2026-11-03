import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CustomersScreen } from '@/features/customers';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/customers'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'customersSection.tabs' });
  return { title: t('customers') };
}

export default async function CustomersPage({ params }: PageProps<'/[locale]/customers'>) {
  await resolveLocale(params);
  return <CustomersScreen />;
}
