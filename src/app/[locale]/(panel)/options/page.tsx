import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { OptionTypesScreen } from '@/features/products';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/options'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'optionsPage' });
  return { title: t('title') };
}

export default async function OptionTypesPage({ params }: PageProps<'/[locale]/options'>) {
  await resolveLocale(params);
  return <OptionTypesScreen />;
}
