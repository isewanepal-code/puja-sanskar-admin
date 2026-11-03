import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LevelsForm } from '@/features/puja-groups';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/pujas/levels'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.tabs' });
  return { title: t('levels') };
}

export default async function PujaLevelsPage({ params }: PageProps<'/[locale]/pujas/levels'>) {
  await resolveLocale(params);
  return <LevelsForm />;
}
