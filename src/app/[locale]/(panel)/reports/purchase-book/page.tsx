import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PurchaseBookReport } from '@/features/reports';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/reports/purchase-book'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'reportsSection.tabs' });
  return { title: t('purchaseBook') };
}

export default async function PurchaseBookPage({
  params,
}: PageProps<'/[locale]/reports/purchase-book'>) {
  await resolveLocale(params);
  return <PurchaseBookReport />;
}
