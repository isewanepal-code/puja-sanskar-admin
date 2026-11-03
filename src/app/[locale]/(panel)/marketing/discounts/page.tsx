import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { DiscountsScreen } from '@/features/marketing';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/marketing/discounts'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'marketing.tabs' });
  return { title: t('discounts') };
}

export default async function DiscountsPage({
  params,
}: PageProps<'/[locale]/marketing/discounts'>) {
  await resolveLocale(params);
  return <DiscountsScreen />;
}
