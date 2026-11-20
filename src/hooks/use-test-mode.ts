'use client';

import { useQuery } from '@tanstack/react-query';

import { request, type Schema } from '@/lib/api';

export type TestModeState = Schema<'TestModeResponse'>;

// What the server allows and whether this session is in test mode (staging).
export function useTestMode() {
  return useQuery({
    queryKey: ['test-mode'],
    queryFn: () => request<TestModeState>('GET', '/admin/test-mode'),
    staleTime: 60 * 1000,
  });
}

// True while deleting skips the "in use" check: test mode asked for, on a server that allows it.
export function useTestModeOn(): boolean {
  const state = useTestMode();
  return state.data?.allowed === true && state.data.on === true;
}
