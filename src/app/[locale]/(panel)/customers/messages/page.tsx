import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { MessagesScreen } from '@/features/customers';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/customers/messages'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'customersSection.tabs' });
  return { title: t('messages') };
}

export default async function MessagesPage({ params }: PageProps<'/[locale]/customers/messages'>) {
  await resolveLocale(params);
  return <MessagesScreen />;
}
