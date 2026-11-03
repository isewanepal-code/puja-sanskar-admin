import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { BusinessProfileScreen } from '@/features/settings';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/settings/business'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'settings.tabs' });
  return { title: t('business') };
}

export default async function BusinessProfilePage({
  params,
}: PageProps<'/[locale]/settings/business'>) {
  await resolveLocale(params);
  return <BusinessProfileScreen />;
}
