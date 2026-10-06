'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ne">
      <body className="flex min-h-screen items-center justify-center px-4">
        <main className="flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="text-xl font-semibold">Something went wrong</h1>

          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. Please try again.
          </p>

          <Button onClick={reset}>Try again</Button>
        </main>
      </body>
    </html>
  );
}
