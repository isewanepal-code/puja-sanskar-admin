'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { Icon } from '@/components/icons';
import { useToast } from '@/components/overlays';
import { isApiError, request } from '@/lib/api';

// Opens the website with its editor switched on: a pencil next to every title, description and
// button, and changes that save straight to the database.
export function EditWebsiteButton() {
  const t = useTranslations('panel');
  const toast = useToast();

  const open = useMutation({
    mutationFn: async () => {
      // Opened first, while the click still counts, so the browser does not block it.
      const tab = window.open('about:blank', '_blank');
      try {
        const { url } = await request<{ url: string }>('POST', '/admin/site-texts/edit-link');
        if (!tab) {
          window.location.assign(url);
          return;
        }
        tab.opener = null;
        tab.location.replace(url);
      } catch (error) {
        tab?.close();
        throw error;
      }
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : t('editWebsiteFailed')),
  });

  return (
    <button
      type="button"
      onClick={() => open.mutate()}
      disabled={open.isPending}
      title={t('editWebsiteHint')}
      className="flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
    >
      <Icon name="store" size={16} />
      <span className="hidden md:inline">{t('editWebsite')}</span>
    </button>
  );
}
