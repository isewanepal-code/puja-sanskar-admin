'use client';

import { useTranslations } from 'next-intl';

import { navigation } from '@/config/navigation';
import { usePathname } from '@/i18n/navigation';

import { PageHeader } from './page-header';

const isUnder = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

// The title and one plain sentence of a page that has its own sidebar entry: the entry's name and help,
// found from the address. The sidebar is the only menu; there are no tabs to look for.
export function SectionHeader() {
  const t = useTranslations('panel');
  const pathname = usePathname();
  const section = navigation
    .flatMap((group) => group.sections)
    .filter((s) => isUnder(pathname, s.href.split('?')[0]!))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (!section) return null;
  return (
    <PageHeader title={t(`sections.${section.key}`)} intro={t(`sectionHelp.${section.key}`)} />
  );
}
