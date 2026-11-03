import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/navigation';
import { resolveLocale } from '@/i18n/server';

export default async function MoneyLayout({ children, params }: LayoutProps<'/[locale]/money'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'money' });

  return (
    <div className="grid gap-6">
      <PageHeader title={t('title')} intro={t('intro')} />
      {children}
    </div>
  );
}
