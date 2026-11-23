import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { MenuAccessScreen } from '@/features/settings';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/settings/menus'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'panel.sections' });
  return { title: t('sidebarMenus') };
}

export default async function MenuAccessPage({ params }: PageProps<'/[locale]/settings/menus'>) {
  await resolveLocale(params);
  return <MenuAccessScreen />;
}
