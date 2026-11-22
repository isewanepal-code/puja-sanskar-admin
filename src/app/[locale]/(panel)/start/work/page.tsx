import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { StockWorkPage } from '@/features/stock';
import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/start/work'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'stockWork' });
  return { title: t('title') };
}

export default async function StockWork({ params }: PageProps<'/[locale]/start/work'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'flow' });
  return (
    <>
      <PageHeader title={t('step.work')} />
      <StockWorkPage />
    </>
  );
}
