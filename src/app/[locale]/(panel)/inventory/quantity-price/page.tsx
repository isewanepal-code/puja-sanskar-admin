import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { PageHeader } from '@/components/navigation';
import { QuantityPricePage } from '@/features/inventory';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/inventory/quantity-price'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'panel.sections' });
  return { title: t('sellPrice') };
}

export default async function SetQuantityPricePage({
  params,
}: PageProps<'/[locale]/inventory/quantity-price'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'panel' });
  return (
    <>
      <PageHeader title={t('sections.sellPrice')} intro={t('sectionHelp.sellPrice')} />
      <Suspense>
        <QuantityPricePage />
      </Suspense>
    </>
  );
}
