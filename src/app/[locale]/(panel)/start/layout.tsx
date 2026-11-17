import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';
import { routes } from '@/lib/routes';

// The four steps of bringing something into the shop share one header and one set of tabs.
export default async function StartLayout({ children, params }: LayoutProps<'/[locale]/start'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'flow' });
  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title={t('title')}
        intro={t('intro')}
        tabs={[
          { href: routes.flowItem(), label: t('step.item') },
          { href: routes.newPurchase(), label: t('step.buy') },
          { href: routes.itemPrices(), label: t('step.prices') },
          { href: routes.stockWork(), label: t('step.work') },
        ]}
      />
      <div className="grid gap-6">{children}</div>
    </div>
  );
}
