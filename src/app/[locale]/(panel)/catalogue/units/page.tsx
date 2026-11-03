import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { UnitsScreen } from '@/features/catalogue';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/catalogue/units'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'catalogue.tabs' });
  return { title: t('units') };
}

export default async function UnitsPage({ params }: PageProps<'/[locale]/catalogue/units'>) {
  await resolveLocale(params);
  return <UnitsScreen />;
}
