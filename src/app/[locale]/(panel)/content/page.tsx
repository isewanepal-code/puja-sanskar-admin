import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { FaqsScreen } from '@/features/content';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/content'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'contentSection.tabs' });
  return { title: t('faqs') };
}

export default async function FaqsPage({ params }: PageProps<'/[locale]/content'>) {
  await resolveLocale(params);
  return <FaqsScreen />;
}
