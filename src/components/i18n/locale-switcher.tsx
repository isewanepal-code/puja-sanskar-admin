'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { localeMeta } from '@/i18n/locales';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

type LocaleSwitcherProps = {
  className?: string;
};

export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const t = useTranslations('localeSwitcher');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function handleChange(nextLocale: Locale) {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <select
      aria-label={t('label')}
      value={locale}
      disabled={isPending}
      onChange={(event) => handleChange(event.target.value as Locale)}
      className={cn(
        'h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
        className,
      )}
    >
      {routing.locales.map((option) => (
        <option key={option} value={option} lang={option}>
          {localeMeta[option].label}
        </option>
      ))}
    </select>
  );
}
