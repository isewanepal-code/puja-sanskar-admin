import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { MantrasScreen } from '@/features/mantras';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/pujas/mantras'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.tabs' });
  return { title: t('mantras') };
}

export default async function MantrasPage({ params }: PageProps<'/[locale]/pujas/mantras'>) {
  await resolveLocale(params);
  return <MantrasScreen />;
}
