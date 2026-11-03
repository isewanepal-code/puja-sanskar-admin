import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getRitualType, RitualTypeForm } from '@/features/puja-groups';
import { resolveLocale } from '@/i18n/server';
import { found } from '@/lib/api';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/pujas/ritual-types/[id]'>): Promise<Metadata> {
  const type = await found(getRitualType((await params).id));
  return { title: `${type.code} · ${type.nameEn}` };
}

export default async function RitualTypePage({
  params,
}: PageProps<'/[locale]/pujas/ritual-types/[id]'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.ritualTypes' });
  const type = await found(getRitualType((await params).id));

  return (
    <div className="grid gap-6">
      <h2 className="font-heading text-xl font-semibold">
        {t('editTitle', { code: type.code })} · {type.nameNe}
      </h2>
      <RitualTypeForm key={type.updatedAt} ritualType={type} />
    </div>
  );
}
