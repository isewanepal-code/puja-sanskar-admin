import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ActivityScreen } from '@/features/system';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/staff/activity'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'staffSection.tabs' });
  return { title: t('activity') };
}

export default async function ActivityPage({ params }: PageProps<'/[locale]/staff/activity'>) {
  await resolveLocale(params);
  return <ActivityScreen />;
}
