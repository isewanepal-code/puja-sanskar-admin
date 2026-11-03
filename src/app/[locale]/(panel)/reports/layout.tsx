import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';
import { routes } from '@/lib/routes';

export default async function ReportsLayout({
  children,
  params,
}: LayoutProps<'/[locale]/reports'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'reportsSection' });

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t('title')}
        tabs={[
          { href: routes.itemSales(), label: t('tabs.itemSales') },
          { href: routes.salesBook(), label: t('tabs.salesBook') },
          { href: routes.vat(), label: t('tabs.vat') },
          { href: routes.dayBook(), label: t('tabs.dayBook') },
          { href: routes.receivables(), label: t('tabs.receivables') },
          { href: routes.profitAndLoss(), label: t('tabs.profitAndLoss') },
          { href: routes.purchaseBook(), label: t('tabs.purchaseBook') },
        ]}
      />
      {children}
    </div>
  );
}
