import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ReturnsScreen } from '@/features/returns';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/orders/returns'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'panel.sections' });
  return { title: t('customerReturns') };
}

export default async function CustomerReturnsPage({
  params,
}: PageProps<'/[locale]/orders/returns'>) {
  await resolveLocale(params);
  return <ReturnsScreen />;
}
