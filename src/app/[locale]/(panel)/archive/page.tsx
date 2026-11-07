import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ArchiveScreen } from '@/features/archive';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/archive'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'archive' });
  return { title: t('title') };
}

export default async function ArchivePage({ params }: PageProps<'/[locale]/archive'>) {
  await resolveLocale(params);
  return <ArchiveScreen />;
}
