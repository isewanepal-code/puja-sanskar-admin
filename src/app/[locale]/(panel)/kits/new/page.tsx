import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { NewKitPage } from '@/features/kits';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/kits/new'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'kitPage' });
  return { title: t('title') };
}

export default async function NewKit({ params }: PageProps<'/[locale]/kits/new'>) {
  await resolveLocale(params);
  return <NewKitPage />;
}
