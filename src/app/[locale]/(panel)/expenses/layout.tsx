import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';
import { routes } from '@/lib/routes';

export default async function Layout({ children, params }: LayoutProps<'/[locale]/expenses'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'expensesSection' });

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title={t('title')}
        tabs={[
          { href: routes.expenses(), label: t('tabs.expenses') },
          { href: routes.expenseCategories(), label: t('tabs.categories') },
        ]}
      />
      {children}
    </div>
  );
}
