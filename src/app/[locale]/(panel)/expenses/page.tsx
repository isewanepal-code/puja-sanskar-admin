import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ExpensesScreen } from '@/features/expenses';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/expenses'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'expensesSection.tabs' });
  return { title: t('expenses') };
}

export default async function ExpensesPage({ params }: PageProps<'/[locale]/expenses'>) {
  await resolveLocale(params);
  return <ExpensesScreen />;
}
