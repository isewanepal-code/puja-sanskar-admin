import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';
import { routes } from '@/lib/routes';

export default async function PujasLayout({ children, params }: LayoutProps<'/[locale]/pujas'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas' });

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title={t('title')}
        tabs={[
          { href: routes.pujaGroups(), label: t('tabs.groups') },
          { href: routes.pujas(), label: t('tabs.list') },
          { href: routes.ritualTypes(), label: t('tabs.ritualTypes') },
          { href: routes.mantras(), label: t('tabs.mantras') },
          { href: routes.pujaLevels(), label: t('tabs.levels') },
        ]}
      />
      {children}
    </div>
  );
}
