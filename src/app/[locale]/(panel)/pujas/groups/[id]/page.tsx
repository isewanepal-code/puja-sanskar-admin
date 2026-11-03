import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { GroupForm, getCatalogue, getGroup, pathTo } from '@/features/puja-groups';
import { Link } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/server';
import { found } from '@/lib/api';
import { routes } from '@/lib/routes';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/pujas/groups/[id]'>): Promise<Metadata> {
  const group = await found(getGroup((await params).id));
  return { title: `[${group.code}] ${group.nameEn}` };
}

export default async function PujaGroupPage({ params }: PageProps<'/[locale]/pujas/groups/[id]'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas' });
  const [group, catalogue] = await Promise.all([
    found(getGroup((await params).id)),
    getCatalogue(),
  ]);
  const parent = pathTo(catalogue.groups, group.parentId ?? undefined).at(-1);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold">
          {t('group.editTitle', { code: group.code })} · {group.nameNe}
        </h2>
        <Link href={routes.pujaGroups(group.id)} className="text-sm text-primary hover:underline">
          {t('tabs.groups')}
        </Link>
      </div>
      <GroupForm
        key={group.updatedAt}
        group={group}
        parent={parent ? { id: parent.id, code: parent.code, nameNe: parent.nameNe } : null}
        ritualTypes={catalogue.ritualTypes}
      />
    </div>
  );
}
