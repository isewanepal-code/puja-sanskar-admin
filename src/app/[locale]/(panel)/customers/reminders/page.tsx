import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { RemindersScreen } from '@/features/customers';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/customers/reminders'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'customersSection.tabs' });
  return { title: t('reminders') };
}

export default async function RemindersPage({
  params,
}: PageProps<'/[locale]/customers/reminders'>) {
  await resolveLocale(params);
  return <RemindersScreen />;
}
