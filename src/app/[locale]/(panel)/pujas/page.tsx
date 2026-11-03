import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { GroupTree } from '@/features/pujas';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/pujas'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.tabs' });
  return { title: t('groups') };
}

export default async function PujaGroupsPage({ params }: PageProps<'/[locale]/pujas'>) {
  await resolveLocale(params);
  return <GroupTree />;
}
