import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { PageHeader } from '@/components/navigation';
import { NewReturnPage } from '@/features/returns';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/orders/returns/new'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'customerReturn' });
  return { title: t('record') };
}

export default async function NewCustomerReturnPage({
  params,
}: PageProps<'/[locale]/orders/returns/new'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'customerReturn' });
  return (
    <>
      <PageHeader title={t('record')} />
      <Suspense>
        <NewReturnPage />
      </Suspense>
    </>
  );
}
