import { getTranslations } from 'next-intl/server';

import { SectionTabs } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';
import { routes } from '@/lib/routes';

export default async function Layout({ children, params }: LayoutProps<'/[locale]/expenses'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'expensesSection' });

  return (
    <div className="grid gap-6">
      <header className="grid gap-4">
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        <SectionTabs
          label={t('title')}
          tabs={[
            { href: routes.expenses(), label: t('tabs.expenses') },
            { href: routes.expenseCategories(), label: t('tabs.categories') },
          ]}
        />
      </header>
      {children}
    </div>
  );
}
