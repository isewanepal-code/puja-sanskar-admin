import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CategoriesScreen } from '@/features/catalogue';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/catalogue'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'catalogue.tabs' });
  return { title: t('categories') };
}

export default async function CategoriesPage({ params }: PageProps<'/[locale]/catalogue'>) {
  await resolveLocale(params);
  return <CategoriesScreen />;
}
