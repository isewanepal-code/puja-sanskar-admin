import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';
import { routes } from '@/lib/routes';

export default async function MarketingLayout({
  children,
  params,
}: LayoutProps<'/[locale]/marketing'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'marketing' });

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t('title')}
        tabs={[
          { href: routes.pandits(), label: t('tabs.pandits') },
          { href: routes.discounts(), label: t('tabs.discounts') },
        ]}
      />
      {children}
    </div>
  );
}
