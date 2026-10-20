'use client';

import { useTranslations } from 'next-intl';

import { Icon } from '@/components/icons';
import { useTheme } from '@/hooks/use-theme';

export function ThemeToggle() {
  const t = useTranslations('theme');
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={t('darkMode')}
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <Icon name={isDark ? 'sun' : 'moon'} />
    </button>
  );
}
