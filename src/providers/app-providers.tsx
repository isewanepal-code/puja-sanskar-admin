'use client';

import type { ReactNode } from 'react';

import { Toaster } from '@/components/overlays';

import { QueryProvider } from './query-provider';

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <Toaster>{children}</Toaster>
    </QueryProvider>
  );
}
