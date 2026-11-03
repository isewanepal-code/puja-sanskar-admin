import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CounterSale } from '@/features/sales';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/orders/counter'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'salesSection.tabs' });
  return { title: t('counterSale') };
}

export default async function CounterSalePage({ params }: PageProps<'/[locale]/orders/counter'>) {
  await resolveLocale(params);
  return <CounterSale />;
}
