import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { KitsScreen } from '@/features/kits';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/pujas/kits'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.tabs' });
  return { title: t('kits') };
}

export default async function KitsPage({ params }: PageProps<'/[locale]/pujas/kits'>) {
  await resolveLocale(params);
  return <KitsScreen />;
}
