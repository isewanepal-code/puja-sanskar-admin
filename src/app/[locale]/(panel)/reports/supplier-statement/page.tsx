import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SupplierStatementReport } from '@/features/reports';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/reports/supplier-statement'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'reportsSection.tabs' });
  return { title: t('supplierStatement') };
}

export default async function SupplierStatementPage({
  params,
}: PageProps<'/[locale]/reports/supplier-statement'>) {
  await resolveLocale(params);
  return <SupplierStatementReport />;
}
