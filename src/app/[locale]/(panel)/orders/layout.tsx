import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';
import { routes } from '@/lib/routes';

export default async function OrdersLayout({ children, params }: LayoutProps<'/[locale]/orders'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'salesSection' });

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title={t('title')}
        tabs={[
          { href: routes.orders(), label: t('tabs.orders') },
          { href: routes.bills(), label: t('tabs.bills') },
        ]}
      />
      {children}
    </div>
  );
}
