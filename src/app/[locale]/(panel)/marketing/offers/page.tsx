import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { OffersScreen } from '@/features/marketing';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/marketing/offers'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'marketing.tabs' });
  return { title: t('offers') };
}

export default async function Page({ params }: PageProps<'/[locale]/marketing/offers'>) {
  await resolveLocale(params);
  return <OffersScreen />;
}
