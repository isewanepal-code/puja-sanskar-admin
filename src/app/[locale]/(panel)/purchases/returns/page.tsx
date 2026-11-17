import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PurchaseReturnsScreen } from '@/features/purchases';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/purchases/returns'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'purchases.tabs' });
  return { title: t('returns') };
}

export default async function PurchaseReturnsPage({
  params,
}: PageProps<'/[locale]/purchases/returns'>) {
  await resolveLocale(params);
  return <PurchaseReturnsScreen />;
}
