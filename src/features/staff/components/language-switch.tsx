'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { cn } from '@/lib/utils';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'ne', label: 'नेपाली' },
] as const;

// Switches the panel between English and Nepali; the choice is kept in a cookie for a year.
export function LanguageSwitch({ defaultLanguage = 'en' }: { defaultLanguage?: 'en' | 'ne' }) {
  const t = useTranslations('panel');
  const locale = useLocale();
  const router = useRouter();

  // Someone who never picked a language gets the shop's default, once.
  useEffect(() => {
    let picked = false;
    try {
      picked = document.cookie.split('; ').some((c) => c.startsWith('NEXT_LOCALE='));
    } catch {
      picked = true;
    }
    if (!picked && defaultLanguage !== locale) {
      document.cookie = `NEXT_LOCALE=${defaultLanguage}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [defaultLanguage, locale, router]);

  function choose(code: string) {
    if (code === locale) return;
    // A browser cookie is not React state, so the compiler's immutability rule does not apply.
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div role="group" aria-label={t('language')} className="flex rounded-md bg-muted p-0.5 text-xs">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => choose(code)}
          aria-pressed={code === locale}
          className={cn(
            'rounded px-2 py-1 font-medium transition-colors',
            code === locale
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
