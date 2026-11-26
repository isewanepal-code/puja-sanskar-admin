import { NewPujaPage } from '@/features/pujas';
import { resolveLocale } from '@/i18n/server';

export default async function NewPuja({ params }: PageProps<'/[locale]/pujas/new'>) {
  await resolveLocale(params);
  return <NewPujaPage />;
}
