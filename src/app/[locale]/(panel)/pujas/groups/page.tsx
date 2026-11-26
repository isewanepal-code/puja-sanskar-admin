import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CatalogueSheetBar } from '@/features/catalogue-sheet';
import Link from 'next/link';

import { GroupTree } from '@/features/pujas';
import { resolveLocale } from '@/i18n/server';
import { routes } from '@/lib/routes';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/pujas/groups'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.tabs' });
  return { title: t('groups') };
}

export default async function PujaGroupsPage({ params }: PageProps<'/[locale]/pujas/groups'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas.tabs' });
  return (
    <div className="grid grid-cols-1 gap-4">
      <Link href={routes.pujas()} className="text-sm text-primary underline">
        ← {t('list')}
      </Link>
      <CatalogueSheetBar />
      <GroupTree />
    </div>
  );
}
