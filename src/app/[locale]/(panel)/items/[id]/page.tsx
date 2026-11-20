import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SimpleItemPage } from '@/features/inventory';
import { ItemPage } from '@/features/products';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/items/[id]'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'shopFloor.items' });
  return { title: t('title') };
}

export default async function ItemDetail({
  params,
  searchParams,
}: PageProps<'/[locale]/items/[id]'>) {
  await resolveLocale(params);
  const { id } = await params;
  // The plain page first; the full step-by-step editor only when a step is asked for ("Advanced").
  const step = (await searchParams).step;
  return step ? <ItemPage id={id} /> : <SimpleItemPage id={id} />;
}
