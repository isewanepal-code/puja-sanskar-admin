import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
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
      <PageHeader
        title={t('title')}
        tabs={[
          { href: routes.customers(), label: t('tabs.customers') },
          { href: routes.carts(), label: t('tabs.carts') },
          { href: routes.listPhotos(), label: t('tabs.lists') },
          { href: routes.messages(), label: t('tabs.messages') },
          { href: routes.reminders(), label: t('tabs.reminders') },
        ]}
      />
      {children}
    </div>
  );
}
