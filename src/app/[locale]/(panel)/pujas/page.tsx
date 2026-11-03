import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { GroupBrowser, getCatalogue, pathTo } from '@/features/puja-groups';
import { listPujas } from '@/features/pujas';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/pujas'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.tabs' });
  return { title: t('groups') };
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function PujaGroupsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/pujas'>) {
  await resolveLocale(params);
  const at = one((await searchParams).at);
  const catalogue = await getCatalogue();
  const opened = pathTo(catalogue.groups, at).at(-1);
  // A tree is small; a group holds tens of pujas at most, so one page shows them all.
  const pujas = opened ? (await listPujas({ groupId: opened.id, limit: 100 })).items : [];

  return <GroupBrowser catalogue={catalogue} at={opened?.id} pujas={pujas} />;
}
