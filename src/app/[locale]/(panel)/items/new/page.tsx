import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { NewItemPage } from '@/features/products';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/items/new'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'itemPage' });
  return { title: t('newTitle') };
}

export default async function NewItem({ params }: PageProps<'/[locale]/items/new'>) {
  await resolveLocale(params);
  return <NewItemPage />;
}
