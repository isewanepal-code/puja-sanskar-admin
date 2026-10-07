'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { ErrorState } from '@/components/feedback';
import { Button } from '@/components/ui/button';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  const t = useTranslations('error');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <ErrorState
        title={t('title')}
        message={t('description')}
        action={<Button onClick={reset}>{t('retry')}</Button>}
      />
    </main>
  );
}
