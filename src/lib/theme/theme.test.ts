import { describe, expect, it, vi } from 'vitest';

import { applyStoredTheme, setTheme, THEME_STORAGE_KEY } from './theme';

function mockPrefersDark(matches: boolean) {
  vi.mocked(window.matchMedia).mockReturnValue({ matches } as MediaQueryList);
}

describe('applyStoredTheme', () => {
  it('follows the system preference when nothing is stored', () => {
    mockPrefersDark(true);

    applyStoredTheme(THEME_STORAGE_KEY);

    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('lets a stored preference override the system', () => {
    mockPrefersDark(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');

    applyStoredTheme(THEME_STORAGE_KEY);

    expect(document.documentElement).not.toHaveClass('dark');
  });
});

describe('setTheme', () => {
  it('persists and applies the theme', () => {
    mockPrefersDark(false);

    setTheme('dark');

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
  });
});
