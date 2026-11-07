import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { LoginForm, LoginShowcase } from '@/features/auth';
import { resolveLocale } from '@/i18n/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/login'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'login' });
  return { title: t('title') };
}

export default async function LoginPage({ params }: PageProps<'/[locale]/login'>) {
  await resolveLocale(params);

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      <LoginShowcase />
      <div className="flex items-center justify-center px-4 py-10">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
