import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { KitPage } from '@/features/kits';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/kits/[id]'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'shopFloor.kits' });
  return { title: t('title') };
}

export default async function KitDetail({ params }: PageProps<'/[locale]/kits/[id]'>) {
  await resolveLocale(params);
  const { id } = await params;
  return <KitPage id={id} />;
}
