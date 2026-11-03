import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';
import { routes } from '@/lib/routes';

export default async function StaffLayout({ children, params }: LayoutProps<'/[locale]/staff'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'staffSection' });

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t('title')}
        tabs={[
          { href: routes.staff(), label: t('tabs.users') },
          { href: routes.activity(), label: t('tabs.activity') },
        ]}
      />
      {children}
    </div>
  );
}
