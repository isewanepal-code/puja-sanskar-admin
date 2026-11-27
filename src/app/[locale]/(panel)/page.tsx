import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { DashboardScreen } from '@/features/dashboard';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  return { title: t('title') };
}

export default function DashboardPage({ params, searchParams }: PageProps<'/[locale]'>) {
  return <DashboardScreen params={params} searchParams={searchParams} />;
}
