import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getCatalogue, groupOptions } from '@/features/puja-groups';
import { PujaForm } from '@/features/pujas';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/pujas/list/new'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.puja' });
  return { title: t('newTitle') };
}

export default async function NewPujaPage({
  params,
  searchParams,
}: PageProps<'/[locale]/pujas/list/new'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.puja' });
  const group = (await searchParams).group;
  const catalogue = await getCatalogue();

  return (
    <div className="grid gap-6">
      <h2 className="font-heading text-xl font-semibold">{t('newTitle')}</h2>
      <PujaForm
        groups={groupOptions(catalogue.groups)}
        groupId={typeof group === 'string' ? group : undefined}
      />
    </div>
  );
}
