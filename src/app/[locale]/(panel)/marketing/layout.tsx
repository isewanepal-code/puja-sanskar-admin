import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';

export default async function MarketingLayout({
  children,
  params,
}: LayoutProps<'/[locale]/marketing'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'marketing' });

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader title={t('title')} />
      {children}
    </div>
  );
}
