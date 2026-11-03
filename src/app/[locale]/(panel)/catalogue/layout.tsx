import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';
import { routes } from '@/lib/routes';

export default async function CatalogueLayout({
  children,
  params,
}: LayoutProps<'/[locale]/catalogue'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'catalogue' });

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t('title')}
        tabs={[
          { href: routes.categories(), label: t('tabs.categories') },
          { href: routes.materials(), label: t('tabs.materials') },
          { href: routes.units(), label: t('tabs.units') },
          { href: routes.sources(), label: t('tabs.sources') },
        ]}
      />
      {children}
    </div>
  );
}
