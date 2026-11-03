import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { MediaLibraryScreen } from '@/features/media';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/content/media'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'contentSection.tabs' });
  return { title: t('media') };
}

export default async function MediaPage({ params }: PageProps<'/[locale]/content/media'>) {
  await resolveLocale(params);
  return <MediaLibraryScreen />;
}
