import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { MenusScreen } from '@/features/content';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/content/menus'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'contentSection.tabs' });
  return { title: t('menus') };
}

export default async function MenusPage({ params }: PageProps<'/[locale]/content/menus'>) {
  await resolveLocale(params);
  return <MenusScreen />;
}
