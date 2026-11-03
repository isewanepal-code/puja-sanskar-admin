import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { GroupForm, getCatalogue, pathTo } from '@/features/puja-groups';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/pujas/groups/new'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.group' });
  return { title: t('newTitle') };
}

export default async function NewPujaGroupPage({
  params,
  searchParams,
}: PageProps<'/[locale]/pujas/groups/new'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.group' });
  const parentId = (await searchParams).parent;
  const catalogue = await getCatalogue();
  const parent = pathTo(catalogue.groups, typeof parentId === 'string' ? parentId : undefined).at(
    -1,
  );

  return (
    <div className="grid gap-6">
      <h2 className="font-heading text-xl font-semibold">
        {parent ? t('newUnder', { code: parent.code }) : t('newTitle')}
      </h2>
      <GroupForm
        parent={parent ? { id: parent.id, code: parent.code, nameNe: parent.nameNe } : null}
        ritualTypes={catalogue.ritualTypes}
      />
    </div>
  );
}
