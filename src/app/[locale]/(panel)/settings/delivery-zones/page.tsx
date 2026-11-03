import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { DeliveryZonesScreen } from '@/features/settings';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/settings/delivery-zones'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'settings.tabs' });
  return { title: t('deliveryZones') };
}

export default async function DeliveryZonesPage({
  params,
}: PageProps<'/[locale]/settings/delivery-zones'>) {
  await resolveLocale(params);
  return <DeliveryZonesScreen />;
}
