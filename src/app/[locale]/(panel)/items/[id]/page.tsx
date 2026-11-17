import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ItemPage } from '@/features/products';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/items/[id]'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'shopFloor.items' });
  return { title: t('title') };
}

export default async function ItemDetail({ params }: PageProps<'/[locale]/items/[id]'>) {
  await resolveLocale(params);
  const { id } = await params;
  return <ItemPage id={id} />;
}
