import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { BannersScreen } from '@/features/content';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/content/banners'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'contentSection.tabs' });
  return { title: t('banners') };
}

export default async function BannersPage({ params }: PageProps<'/[locale]/content/banners'>) {
  await resolveLocale(params);
  return <BannersScreen />;
}
