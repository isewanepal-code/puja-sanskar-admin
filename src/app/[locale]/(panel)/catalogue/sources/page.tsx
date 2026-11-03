import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SourcesScreen } from '@/features/catalogue';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/catalogue/sources'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'catalogue.tabs' });
  return { title: t('sources') };
}

export default async function SourcesPage({ params }: PageProps<'/[locale]/catalogue/sources'>) {
  await resolveLocale(params);
  return <SourcesScreen />;
}
