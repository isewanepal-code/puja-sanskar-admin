'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Icon } from '@/components/icons';
import { request, type Schema } from '@/lib/api';
import { BRANCH_COOKIE } from '@/lib/session/cookies';

type Branch = Schema<'BranchResponse'>;

const remember = (code: string) => {
  document.cookie = code
    ? `${BRANCH_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`
    : `${BRANCH_COOKIE}=; path=/; max-age=0; samesite=lax`;
};

// The branch every screen works in; "every branch" reads across all the user may see.
export function BranchSwitcher({ current }: { current: string }) {
  const t = useTranslations('panel');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState(current);
  const branches = useQuery({
    queryKey: ['branches', 'mine'],
    queryFn: () => request<Branch[]>('GET', '/admin/branches/mine'),
    staleTime: 5 * 60 * 1000,
  });
  const list = branches.data ?? [];

  const choose = (code: string) => {
    setChosen(code);
    remember(code);
    // Every list and figure belongs to a branch: read them all again.
    void queryClient.invalidateQueries();
    router.refresh();
  };

  if (list.length === 0) return null;
  if (list.length === 1) {
    return (
      <span className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm">
        <Icon name="store" size={16} className="text-muted-foreground" />
        {list[0]!.name}
      </span>
    );
  }
  return (
    <label className="flex items-center gap-2 rounded-md border border-border bg-card py-1 pr-1 pl-2.5 text-sm">
      <Icon name="store" size={16} className="text-muted-foreground" />
      <span className="sr-only">{t('branch')}</span>
      <select
        value={chosen}
        onChange={(event) => choose(event.target.value)}
        className="h-7 bg-transparent pr-1 font-medium focus:outline-none"
      >
        <option value="">{t('allBranches')}</option>
        {list.map((branch) => (
          <option key={branch.id} value={branch.code}>
            {branch.name}
            {branch.servesOnline ? ` · ${t('online')}` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
