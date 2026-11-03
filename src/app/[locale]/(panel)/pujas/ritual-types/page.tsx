import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { RitualTypesScreen } from '@/features/puja-groups';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/pujas/ritual-types'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.tabs' });
  return { title: t('ritualTypes') };
}

export default async function RitualTypesPage({
  params,
}: PageProps<'/[locale]/pujas/ritual-types'>) {
  await resolveLocale(params);
  return <RitualTypesScreen />;
}
