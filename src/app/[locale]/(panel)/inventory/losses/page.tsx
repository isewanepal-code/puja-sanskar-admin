import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { LossList } from '@/features/stock';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/inventory/losses'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'losses' });
  return { title: t('title') };
}

// Damaged, expired, lost and spilled stock written off at the branch.
export default async function Losses({ params }: PageProps<'/[locale]/inventory/losses'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'losses' });
  return (
    <>
      <PageHeader title={t('title')} intro={t('intro')} />
      <div className="max-w-4xl">
        <LossList />
      </div>
    </>
  );
}
