'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { usePathname, useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

// One tap between Nepali and English; it shows the language it switches to.
export function LocaleSwitcher() {
  const t = useTranslations('localeSwitcher');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const next: Locale = locale === 'ne' ? 'en' : 'ne';

  return (
    <button
      type="button"
      className="lang-toggle"
      lang={next}
      aria-label={t(next === 'en' ? 'toEnglish' : 'toNepali')}
      title={t(next === 'en' ? 'english' : 'nepali')}
      disabled={isPending}
      onClick={() => startTransition(() => router.replace(pathname, { locale: next }))}
    >
      {next === 'en' ? 'EN' : 'ने'}
    </button>
  );
}
