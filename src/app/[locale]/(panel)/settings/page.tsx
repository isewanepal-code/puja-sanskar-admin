import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { TaxClassesScreen } from '@/features/settings';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/settings'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'settings.tabs' });
  return { title: t('taxClasses') };
}

export default async function TaxClassesPage({ params }: PageProps<'/[locale]/settings'>) {
  await resolveLocale(params);
  return <TaxClassesScreen />;
}
