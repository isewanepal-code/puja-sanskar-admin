import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { DataResetScreen } from '@/features/system';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/data-reset'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'dataReset' });
  return { title: t('title') };
}

export default async function DataResetPage({ params }: PageProps<'/[locale]/data-reset'>) {
  await resolveLocale(params);
  return <DataResetScreen />;
}
