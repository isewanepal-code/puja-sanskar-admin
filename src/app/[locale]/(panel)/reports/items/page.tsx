import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ItemSalesReport } from '@/features/reports';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/reports/items'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'reportsSection.tabs' });
  return { title: t('itemSales') };
}

export default async function ItemSalesPage({ params }: PageProps<'/[locale]/reports/items'>) {
  await resolveLocale(params);
  return <ItemSalesReport />;
}
