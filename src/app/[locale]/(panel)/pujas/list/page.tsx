import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PujasScreen } from '@/features/pujas';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/pujas/list'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.tabs' });
  return { title: t('list') };
}

export default async function PujasPage({ params }: PageProps<'/[locale]/pujas/list'>) {
  await resolveLocale(params);
  return <PujasScreen />;
}
