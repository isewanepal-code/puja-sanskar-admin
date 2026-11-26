'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { isApiError } from '@/lib/api';
import { shortStock, type ShortItem } from '@/lib/short-stock';

type QueryProviderProps = {
  children: ReactNode;
};

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // A kit switched on without its compulsory items in stock: say which, wherever it was done.
        mutationCache: new MutationCache({
          onError: (error) => {
            if (isApiError(error, 'KIT_SHORT_OF_STOCK')) {
              shortStock.show(
                error.details as ShortItem[],
                window.location.pathname + window.location.search,
              );
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
