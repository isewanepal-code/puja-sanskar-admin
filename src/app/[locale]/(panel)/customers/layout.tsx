import { getTranslations } from 'next-intl/server';

import { SectionTabs } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';
import { routes } from '@/lib/routes';

export default async function CustomersLayout({
  children,
  params,
}: LayoutProps<'/[locale]/customers'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'customersSection' });

  return (
    <div className="grid gap-6">
      <header className="grid gap-4">
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        <SectionTabs
          label={t('title')}
          tabs={[
            { href: routes.customers(), label: t('tabs.customers') },
            { href: routes.carts(), label: t('tabs.carts') },
            { href: routes.listPhotos(), label: t('tabs.lists') },
            { href: routes.messages(), label: t('tabs.messages') },
            { href: routes.reminders(), label: t('tabs.reminders') },
          ]}
        />
      </header>
      {children}
    </div>
  );
}
