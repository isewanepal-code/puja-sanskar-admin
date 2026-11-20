'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Icon } from '@/components/icons';
import { useTestMode } from '@/hooks/use-test-mode';
import { TEST_MODE_COOKIE } from '@/lib/session/cookies';
import { cn } from '@/lib/utils';

const remember = (on: boolean) => {
  document.cookie = on
    ? `${TEST_MODE_COOKIE}=on; path=/; max-age=31536000; samesite=lax`
    : `${TEST_MODE_COOKIE}=; path=/; max-age=0; samesite=lax`;
};

// Staging or Production, in the header. On a staging server staff may switch to Staging: then
// anything (items, bills, stock) can be deleted even when it is used. Production works as always,
// and a production server never shows the switch at all.
export function TestModeSwitch({ initialOn }: { initialOn: boolean }) {
  const t = useTranslations('testMode');
  const router = useRouter();
  const queryClient = useQueryClient();
  const state = useTestMode();
  const [on, setOn] = useState(initialOn);

  const choose = (next: boolean) => {
    setOn(next);
    remember(next);
    // Every delete check and list may differ now.
    void queryClient.invalidateQueries();
    router.refresh();
  };

  if (!state.data) return null;

  if (!state.data.allowed) {
    return (
      <span
        title={t('liveOnlyHelp')}
        className="inline-flex items-center gap-1.5 rounded-md bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"
      >
        <span className="size-2 rounded-full bg-success" />
        {t('production')}
      </span>
    );
  }

  const active = on && state.data.on !== false;
  const button = 'rounded px-2.5 py-1 text-xs font-semibold transition-colors';
  return (
    <div
      role="radiogroup"
      aria-label={t('label')}
      title={t('help')}
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5"
    >
      <button
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => choose(true)}
        className={cn(
          button,
          active ? 'bg-warning text-black' : 'text-muted-foreground hover:bg-muted',
        )}
      >
        {t('staging')}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={!active}
        onClick={() => choose(false)}
        className={cn(
          button,
          !active ? 'bg-success text-white' : 'text-muted-foreground hover:bg-muted',
        )}
      >
        {t('production')}
      </button>
    </div>
  );
}

// The strip under the header while test mode is on, so nobody forgets it.
export function TestModeBanner({ initialOn }: { initialOn: boolean }) {
  const t = useTranslations('testMode');
  const state = useTestMode();
  if (!initialOn || !state.data?.allowed) return null;
  return (
    <div className="sticky top-14 z-20 flex items-center gap-2 bg-warning/15 px-4 py-1.5 text-xs text-foreground md:px-6">
      <Icon name="info" size={14} className="shrink-0" />
      <span>{t('banner')}</span>
    </div>
  );
}
