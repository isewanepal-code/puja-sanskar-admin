import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SuppliersScreen } from '@/features/purchases';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/suppliers'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'shopFloor.suppliers' });
  return { title: t('title') };
}

export default async function SuppliersPage({ params }: PageProps<'/[locale]/suppliers'>) {
  await resolveLocale(params);
  return <SuppliersScreen />;
}
