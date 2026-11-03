import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';
import { routes } from '@/lib/routes';

export default async function SettingsLayout({
  children,
  params,
}: LayoutProps<'/[locale]/settings'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'settings' });

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t('title')}
        tabs={[
          { href: routes.taxClasses(), label: t('tabs.taxClasses') },
          { href: routes.deliveryZones(), label: t('tabs.deliveryZones') },
          { href: routes.deliverySlots(), label: t('tabs.deliverySlots') },
          { href: routes.shopSettings(), label: t('tabs.shop') },
          { href: routes.businessProfile(), label: t('tabs.business') },
          { href: routes.branches(), label: t('tabs.branches') },
          { href: routes.dataTools(), label: t('tabs.data') },
        ]}
      />
      {children}
    </div>
  );
}
