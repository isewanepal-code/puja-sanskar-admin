import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { BranchesScreen } from '@/features/branches';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/settings/branches'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'settings.tabs' });
  return { title: t('branches') };
}

export default async function BranchesPage({ params }: PageProps<'/[locale]/settings/branches'>) {
  await resolveLocale(params);
  return <BranchesScreen />;
}
