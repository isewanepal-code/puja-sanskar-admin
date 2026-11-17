import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { BuyPage } from '@/features/purchases';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/start/buy'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'buyPage' });
  return { title: t('title') };
}

export default async function BuyNew({ params }: PageProps<'/[locale]/start/buy'>) {
  await resolveLocale(params);
  return <BuyPage />;
}
