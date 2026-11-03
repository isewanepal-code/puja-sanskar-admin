import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { StockScreen } from '@/features/stock';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/catalogue/stock'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'catalogue.tabs' });
  return { title: t('stock') };
}

export default async function StockPage({ params }: PageProps<'/[locale]/catalogue/stock'>) {
  await resolveLocale(params);
  return <StockScreen />;
}
