import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { MoneyScreen } from '@/features/money';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/money'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'money' });
  return { title: t('title') };
}

export default async function MoneyPage({ params }: PageProps<'/[locale]/money'>) {
  await resolveLocale(params);
  return <MoneyScreen />;
}
