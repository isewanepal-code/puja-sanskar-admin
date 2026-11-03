import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ArticlesScreen } from '@/features/content';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/content/articles'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'contentSection.tabs' });
  return { title: t('articles') };
}

export default async function ArticlesPage({ params }: PageProps<'/[locale]/content/articles'>) {
  await resolveLocale(params);
  return <ArticlesScreen />;
}
