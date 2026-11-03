import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { DataToolsScreen } from '@/features/system';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/settings/data'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'settings.tabs' });
  return { title: t('data') };
}

export default async function DataPage({ params }: PageProps<'/[locale]/settings/data'>) {
  await resolveLocale(params);
  return <DataToolsScreen />;
}
