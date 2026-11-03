import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';
import { routes } from '@/lib/routes';

export default async function Layout({ children, params }: LayoutProps<'/[locale]/purchases'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'purchases' });

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t('title')}
        tabs={[
          { href: routes.purchaseBills(), label: t('tabs.bills') },
          { href: routes.supplierPayments(), label: t('tabs.payments') },
        ]}
      />
      {children}
    </div>
  );
}
