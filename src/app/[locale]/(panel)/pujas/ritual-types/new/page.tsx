import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { RitualTypeForm } from '@/features/puja-groups';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/pujas/ritual-types/new'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.ritualTypes' });
  return { title: t('newTitle') };
}

export default async function NewRitualTypePage({
  params,
}: PageProps<'/[locale]/pujas/ritual-types/new'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.ritualTypes' });

  return (
    <div className="grid gap-6">
      <h2 className="font-heading text-xl font-semibold">{t('newTitle')}</h2>
      <RitualTypeForm />
    </div>
  );
}
