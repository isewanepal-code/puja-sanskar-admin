import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PricesPage } from '@/features/products';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/start/prices'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pricesPage' });
  return { title: t('title') };
}

export default async function ItemPrices({ params }: PageProps<'/[locale]/start/prices'>) {
  await resolveLocale(params);
  return <PricesPage />;
}
