import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ShopSettingsScreen } from '@/features/settings';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/settings/shop'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'settings.tabs' });
  return { title: t('shop') };
}

export default async function ShopSettingsPage({ params }: PageProps<'/[locale]/settings/shop'>) {
  await resolveLocale(params);
  return <ShopSettingsScreen />;
}
