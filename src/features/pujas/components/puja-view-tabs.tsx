'use client';

import { useTranslations } from 'next-intl';

import { SectionTabs } from '@/components/navigation';
import { routes } from '@/lib/routes';

// Pujas are seen two ways, as the tree of groups or as one list; one sidebar line, two tabs.
export function PujaViewTabs() {
  const t = useTranslations('pujas.tabs');
  return (
    <SectionTabs
      label={t('view')}
      tabs={[
        { href: routes.pujaGroups(), label: t('groups') },
        { href: routes.pujas(), label: t('list') },
      ]}
    />
  );
}
