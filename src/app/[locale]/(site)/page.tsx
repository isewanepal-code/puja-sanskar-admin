import { resolveLocale } from '@/i18n/server';

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  await resolveLocale(params);

  return null;
}
