'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { ConfirmDialog } from '@/components/overlays';

type GuardOptions = {
  // Keeps the work as a draft before leaving; offered as a third way out.
  onSaveDraft?: () => void;
  // Throws the kept draft away when the work is left on purpose.
  onDiscard?: () => void;
};

const BACK = '\0back';

// A page form with work typed into it asks before the page is left: closing or reloading the tab
// (the browser's own question), any link inside the admin (the sidebar, the tabs), and the browser's
// Back button. With a draft handler the question has three answers: stay, save a draft and go, or go
// and let the work be lost. Render what it returns once on the page; pass false after a save so
// nothing is asked on the way out.
export function useUnsavedGuard(dirty: boolean, options: GuardOptions = {}): ReactNode {
  const t = useTranslations('common');
  const router = useRouter();
  const [leaving, setLeaving] = useState<string | null>(null);
  const allowed = useRef(false);
  const held = useRef(false);
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (event: BeforeUnloadEvent) => {
      if (allowed.current) return;
      // Work is kept as a draft even when the tab goes without asking.
      latest.current.onSaveDraft?.();
      event.preventDefault();
      event.returnValue = '';
    };
    const onClick = (event: MouseEvent) => {
      if (allowed.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page, only a different place on it.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setLeaving(url.pathname + url.search + url.hash);
    };
    // Back: one entry is added to the history, so the first press only takes that away and the page
    // stays; the question is asked, and leaving then goes back past it.
    if (!held.current) {
      window.history.pushState({ guard: true }, '', window.location.href);
      held.current = true;
    }
    const onPop = () => {
      if (allowed.current) return;
      window.history.pushState({ guard: true }, '', window.location.href);
      setLeaving(BACK);
    };
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('popstate', onPop);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);

  const go = () => {
    allowed.current = true;
    if (leaving === BACK) {
      // Past the entry the guard added and the page's own.
      window.history.go(held.current ? -2 : -1);
    } else if (leaving) {
      router.push(leaving);
    }
  };

  return (
    <ConfirmDialog
      open={leaving !== null}
      onOpenChange={(open) => (open ? undefined : setLeaving(null))}
      title={t('leaveTitle')}
      description={options.onSaveDraft ? t('leaveDraftBody') : t('leaveBody')}
      confirmLabel={options.onSaveDraft ? t('leaveDiscard') : t('leave')}
      keepLabel={t('stay')}
      danger={false}
      extraLabel={options.onSaveDraft ? t('leaveSaveDraft') : undefined}
      onExtra={
        options.onSaveDraft
          ? () => {
              options.onSaveDraft?.();
              go();
            }
          : undefined
      }
      onConfirm={() => {
        options.onDiscard?.();
        go();
      }}
    />
  );
}
