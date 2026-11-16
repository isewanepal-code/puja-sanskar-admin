import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { OptionTypesScreen } from '@/features/products';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/catalogue/options'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'catalogue.tabs' });
  return { title: t('options') };
}

export default async function OptionTypesPage({
  params,
}: PageProps<'/[locale]/catalogue/options'>) {
  await resolveLocale(params);
  return <OptionTypesScreen />;
}
