import { PujaPage } from '@/features/pujas';
import { resolveLocale } from '@/i18n/server';

export default async function PujaDetail({ params }: PageProps<'/[locale]/pujas/[id]'>) {
  await resolveLocale(params);
  const { id } = await params;
  return <PujaPage id={id} />;
}
