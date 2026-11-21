import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CatalogueSheetBar } from '@/features/catalogue-sheet';
import { PriceGroupsScreen } from '@/features/marketing';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/marketing/groups'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'marketing.tabs' });
  return { title: t('groups') };
}

export default async function Page({ params }: PageProps<'/[locale]/marketing/groups'>) {
  await resolveLocale(params);
  return (
    <div className="grid grid-cols-1 gap-4">
      <CatalogueSheetBar />
      <PriceGroupsScreen />
    </div>
  );
}
