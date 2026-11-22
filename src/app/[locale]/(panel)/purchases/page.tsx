import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PurchaseBillsScreen } from '@/features/purchases';
import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/purchases'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'purchases.tabs' });
  return { title: t('bills') };
}

export default async function PurchaseBillsPage({ params }: PageProps<'/[locale]/purchases'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'panel.sections' });
  const about = await getTranslations({ locale, namespace: 'resources.purchaseBills' });
  return (
    <>
      <PageHeader title={t('buying')} intro={about('about')} />
      <PurchaseBillsScreen />
    </>
  );
}
