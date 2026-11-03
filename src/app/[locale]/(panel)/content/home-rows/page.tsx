import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { HomeSectionsScreen } from '@/features/content';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/content/home-rows'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'contentSection.tabs' });
  return { title: t('homeSections') };
}

export default async function HomeRowsPage({ params }: PageProps<'/[locale]/content/home-rows'>) {
  await resolveLocale(params);
  return <HomeSectionsScreen />;
}
