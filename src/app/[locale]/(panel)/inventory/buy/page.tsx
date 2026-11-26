import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { SimpleBuyPage } from '@/features/inventory';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/inventory/buy'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'inventory.buy' });
  return { title: t('title') };
}

export default async function Buy({ params, searchParams }: PageProps<'/[locale]/inventory/buy'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'inventory.buy' });
  // Opened from "Buy it now" after adding an item: that item is already on the first line.
  const query = await searchParams;
  const item = query.item?.toString();
  const back = query.back?.toString();
  return (
    <>
      <PageHeader title={t('title')} intro={t('intro')} />
      <SimpleBuyPage itemId={item} back={back} />
    </>
  );
}
