import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ORDER_STATUSES, OrdersScreen, type OrderStatus } from '@/features/sales';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/orders'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'orders' });
  return { title: t('title') };
}

const isStatus = (value: unknown): value is OrderStatus =>
  ORDER_STATUSES.includes(value as OrderStatus);

export default async function OrdersPage({ params, searchParams }: PageProps<'/[locale]/orders'>) {
  await resolveLocale(params);
  const { status } = await searchParams;
  return <OrdersScreen status={isStatus(status) ? status : undefined} />;
}
