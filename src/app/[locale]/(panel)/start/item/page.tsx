import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { BareItemPage } from '@/features/products';
import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/start/item'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'itemPage' });
  return { title: t('bareTitle') };
}

export default async function StartItem({ params }: PageProps<'/[locale]/start/item'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'flow' });
  return (
    <>
      <PageHeader title={t('step.item')} />
      <BareItemPage />
    </>
  );
}
