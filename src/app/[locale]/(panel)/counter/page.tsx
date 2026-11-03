import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CounterSale } from '@/features/sales';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/counter'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'shopFloor.counter' });
  return { title: t('title') };
}

export default async function CounterPage({ params }: PageProps<'/[locale]/counter'>) {
  await resolveLocale(params);
  return <CounterSale />;
}
