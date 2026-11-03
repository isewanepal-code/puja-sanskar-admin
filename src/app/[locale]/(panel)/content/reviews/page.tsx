import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ReviewsScreen } from '@/features/content';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/content/reviews'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'contentSection.tabs' });
  return { title: t('reviews') };
}

export default async function ReviewsPage({ params }: PageProps<'/[locale]/content/reviews'>) {
  await resolveLocale(params);
  return <ReviewsScreen />;
}
