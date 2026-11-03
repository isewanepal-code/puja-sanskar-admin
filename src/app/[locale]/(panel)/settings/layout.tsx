import { getTranslations } from 'next-intl/server';

import { SectionTabs } from '@/components/navigation';
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
      <header className="grid gap-4">
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        <SectionTabs
          label={t('title')}
          tabs={[
            { href: routes.taxClasses(), label: t('tabs.taxClasses') },
            { href: routes.deliveryZones(), label: t('tabs.deliveryZones') },
            { href: routes.deliverySlots(), label: t('tabs.deliverySlots') },
            { href: routes.shopSettings(), label: t('tabs.shop') },
            { href: routes.businessProfile(), label: t('tabs.business') },
            { href: routes.dataTools(), label: t('tabs.data') },
          ]}
        />
      </header>
      {children}
    </div>
  );
}
