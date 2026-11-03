import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ProfitAndLossReport } from '@/features/reports';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/reports/profit-and-loss'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'reportsSection.tabs' });
  return { title: t('profitAndLoss') };
}

export default async function ProfitAndLossPage({
  params,
}: PageProps<'/[locale]/reports/profit-and-loss'>) {
  await resolveLocale(params);
  return <ProfitAndLossReport />;
}
