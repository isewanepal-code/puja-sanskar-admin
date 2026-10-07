'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/feedback';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <ErrorState
        title="Something went wrong"
        message="An unexpected error occurred. Please try again."
        action={<Button onClick={reset}>Try again</Button>}
      />
    </main>
  );
}
