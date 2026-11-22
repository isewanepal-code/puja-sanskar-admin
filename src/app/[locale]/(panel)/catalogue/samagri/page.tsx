import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { MaterialsScreen } from '@/features/catalogue';
import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/catalogue/samagri'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'catalogue.tabs' });
  return { title: t('materials') };
}

export default async function MaterialsPage({ params }: PageProps<'/[locale]/catalogue/samagri'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'catalogue.tabs' });
  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader title={t('materials')} />
      <MaterialsScreen />
    </div>
  );
}
