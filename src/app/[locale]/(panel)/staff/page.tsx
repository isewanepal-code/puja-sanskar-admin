import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { UsersScreen } from '@/features/staff-accounts';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/staff'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'staffSection.tabs' });
  return { title: t('users') };
}

export default async function StaffPage({ params }: PageProps<'/[locale]/staff'>) {
  await resolveLocale(params);
  return <UsersScreen />;
}
