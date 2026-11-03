import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ExpenseCategoriesScreen } from '@/features/expenses';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/expenses/categories'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'expensesSection.tabs' });
  return { title: t('categories') };
}

export default async function ExpenseCategoriesPage({
  params,
}: PageProps<'/[locale]/expenses/categories'>) {
  await resolveLocale(params);
  return <ExpenseCategoriesScreen />;
}
