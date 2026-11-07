import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { parseStockShow, StockScreen } from '@/features/stock';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/stock'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'shopFloor.stock' });
  return { title: t('title') };
}

export default async function StockPage({ params, searchParams }: PageProps<'/[locale]/stock'>) {
  await resolveLocale(params);
  const show = parseStockShow((await searchParams).show?.toString());
  // Keyed by the choice, so a link from the dashboard opens on the list it names.
  return <StockScreen key={show} initialShow={show} />;
}
