'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { ConfirmDialog } from '@/components/overlays';

// A page form with work typed into it asks before the page is left: closing or reloading the tab
// (the browser's own question), and any link inside the admin (the sidebar, the tabs). Render what it
// returns once on the page; pass false after a save so nothing is asked on the way out.
export function useUnsavedGuard(dirty: boolean): ReactNode {
  const t = useTranslations('common');
  const router = useRouter();
  const [leaving, setLeaving] = useState<string | null>(null);
  const allowed = useRef(false);

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (event: BeforeUnloadEvent) => {
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
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);

  return (
    <ConfirmDialog
      open={leaving !== null}
      onOpenChange={(open) => (open ? undefined : setLeaving(null))}
      title={t('leaveTitle')}
      description={t('leaveBody')}
      confirmLabel={t('leave')}
      keepLabel={t('stay')}
      danger={false}
      onConfirm={() => {
        allowed.current = true;
        if (leaving) router.push(leaving);
      }}
    />
  );
}
