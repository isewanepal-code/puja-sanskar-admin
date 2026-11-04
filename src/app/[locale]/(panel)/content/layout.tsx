import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';
import { routes } from '@/lib/routes';

export default async function ContentLayout({
  children,
  params,
}: LayoutProps<'/[locale]/content'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'contentSection' });

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t('title')}
        tabs={[
          { href: routes.menus(), label: t('tabs.menus') },
          { href: routes.faqs(), label: t('tabs.faqs') },
          { href: routes.festivals(), label: t('tabs.festivals') },
          { href: routes.articles(), label: t('tabs.articles') },
          { href: routes.banners(), label: t('tabs.banners') },
          { href: routes.homeSections(), label: t('tabs.homeSections') },
          { href: routes.stories(), label: t('tabs.stories') },
          { href: routes.reviews(), label: t('tabs.reviews') },
          { href: routes.media(), label: t('tabs.media') },
        ]}
      />
      {children}
    </div>
  );
}
