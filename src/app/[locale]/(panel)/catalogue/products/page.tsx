import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ProductsScreen } from '@/features/products';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/catalogue/products'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'catalogue.tabs' });
  return { title: t('products') };
}

export default async function ProductsPage({ params }: PageProps<'/[locale]/catalogue/products'>) {
  await resolveLocale(params);
  return <ProductsScreen />;
}
