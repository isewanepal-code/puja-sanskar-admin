import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PurchaseBillsScreen } from '@/features/purchases';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/purchases'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'purchases.tabs' });
  return { title: t('bills') };
}

export default async function PurchaseBillsPage({ params }: PageProps<'/[locale]/purchases'>) {
  await resolveLocale(params);
  return <PurchaseBillsScreen />;
}
