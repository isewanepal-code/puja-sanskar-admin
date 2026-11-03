import { getTranslations } from 'next-intl/server';

import { resolveLocale } from '@/i18n/server';

export default async function SuppliersLayout({
  children,
  params,
}: LayoutProps<'/[locale]/suppliers'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'shopFloor.suppliers' });

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('intro')}</p>
      </header>
      {children}
    </div>
  );
}
