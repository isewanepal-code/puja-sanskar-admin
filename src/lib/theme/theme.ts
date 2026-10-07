export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = Exclude<Theme, 'system'>;

export const THEME_STORAGE_KEY = 'theme';

// Serialized into the inline theme script, so it must not reference outer scope.
export function applyStoredTheme(storageKey: string) {
  let stored: string | null = null;

  try {
    stored = window.localStorage.getItem(storageKey);
  } catch {}

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = stored === 'dark' || (stored !== 'light' && prefersDark);
  const root = document.documentElement;

  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
}

const key = JSON.stringify(THEME_STORAGE_KEY);

export const themeScript = `(function(){var apply=${applyStoredTheme.toString()};apply(${key});window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(){apply(${key})})})()`;

export function setTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}

  applyStoredTheme(THEME_STORAGE_KEY);
}
