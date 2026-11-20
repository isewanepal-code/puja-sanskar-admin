import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { AddItemPage } from '@/features/inventory';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/inventory/add-item'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'inventory.addItem' });
  return { title: t('title') };
}

export default async function AddItem({ params }: PageProps<'/[locale]/inventory/add-item'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'inventory.addItem' });
  return (
    <>
      <PageHeader title={t('title')} intro={t('intro')} />
      <AddItemPage />
    </>
  );
}
