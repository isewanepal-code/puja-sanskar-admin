import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SupplierPaymentsScreen } from '@/features/purchases';
import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/purchases/payments'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'purchases.tabs' });
  return { title: t('payments') };
}

export default async function SupplierPaymentsPage({
  params,
}: PageProps<'/[locale]/purchases/payments'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'panel.sections' });
  const about = await getTranslations({ locale, namespace: 'resources.supplierPayments' });
  return (
    <>
      <PageHeader title={t('supplierPayments')} intro={about('about')} />
      <SupplierPaymentsScreen />
    </>
  );
}
