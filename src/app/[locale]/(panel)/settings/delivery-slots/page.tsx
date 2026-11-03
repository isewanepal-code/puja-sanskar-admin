import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { DeliverySlotsScreen } from '@/features/settings';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/settings/delivery-slots'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'settings.tabs' });
  return { title: t('deliverySlots') };
}

export default async function DeliverySlotsPage({
  params,
}: PageProps<'/[locale]/settings/delivery-slots'>) {
  await resolveLocale(params);
  return <DeliverySlotsScreen />;
}
