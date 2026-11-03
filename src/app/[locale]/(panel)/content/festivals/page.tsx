import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { FestivalsScreen } from '@/features/content';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/content/festivals'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'contentSection.tabs' });
  return { title: t('festivals') };
}

export default async function FestivalsPage({ params }: PageProps<'/[locale]/content/festivals'>) {
  await resolveLocale(params);
  return <FestivalsScreen />;
}
