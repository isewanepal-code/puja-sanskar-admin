import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { BrandsScreen } from '@/features/catalogue';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/catalogue/brands'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'catalogue.tabs' });
  return { title: t('brands') };
}

export default async function BrandsPage({ params }: PageProps<'/[locale]/catalogue/brands'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'catalogue.tabs' });
  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader title={t('brands')} />
      <BrandsScreen />
    </div>
  );
}
