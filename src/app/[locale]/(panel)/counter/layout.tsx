import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { QuickQr } from '@/features/sales';
import { resolveLocale } from '@/i18n/server';

export default async function CounterLayout({
  children,
  params,
}: LayoutProps<'/[locale]/counter'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'shopFloor.counter' });

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader title={t('title')} intro={t('intro')} actions={<QuickQr />} />
      {children}
    </div>
  );
}
