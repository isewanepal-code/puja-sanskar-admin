import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';

export default async function ItemsLayout({ children, params }: LayoutProps<'/[locale]/items'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'shopFloor.items' });

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader title={t('title')} intro={t('intro')} />
      {children}
    </div>
  );
}
