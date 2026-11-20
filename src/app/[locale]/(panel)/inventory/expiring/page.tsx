import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { ExpiryList } from '@/features/stock';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/inventory/expiring'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'stockWork.expiry' });
  return { title: t('title') };
}

// Only what is about to spoil; the other stock jobs sit on each row of the Stock page.
export default async function Expiring({ params }: PageProps<'/[locale]/inventory/expiring'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'stockWork.expiry' });
  return (
    <>
      <PageHeader title={t('title')} intro={t('note')} />
      <div className="max-w-4xl">
        <ExpiryList />
      </div>
    </>
  );
}
