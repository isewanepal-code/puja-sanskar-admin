import type { Metadata } from 'next';

import { ManualPage } from '@/features/manual';
import { resolveLocale } from '@/i18n/server';

export const metadata: Metadata = { title: 'Manual' };

export default async function Page({ params }: PageProps<'/[locale]/manual'>) {
  await resolveLocale(params);
  return <ManualPage />;
}
