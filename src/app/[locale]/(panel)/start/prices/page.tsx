import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PricesPage } from '@/features/products';
import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/start/prices'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pricesPage' });
  return { title: t('title') };
}

export default async function ItemPrices({ params }: PageProps<'/[locale]/start/prices'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'flow' });
  return (
    <>
      <PageHeader title={t('step.prices')} intro={t('hint.prices')} />
      <PricesPage />
    </>
  );
}
