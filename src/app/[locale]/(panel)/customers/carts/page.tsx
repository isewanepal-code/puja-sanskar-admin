import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CartsScreen } from '@/features/customers';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/customers/carts'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'customersSection.tabs' });
  return { title: t('carts') };
}

export default async function CartsPage({ params }: PageProps<'/[locale]/customers/carts'>) {
  await resolveLocale(params);
  return <CartsScreen />;
}
