import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test/render';

import { LocaleSwitcher } from './locale-switcher';

const replace = vi.fn();

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/pujas',
  useRouter: () => ({ replace }),
}));

describe('LocaleSwitcher', () => {
  it('shows the active locale', () => {
    render(<LocaleSwitcher />);

    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
  });

  it('keeps the current path when switching locale', async () => {
    const { user } = render(<LocaleSwitcher />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'ne');

    expect(replace).toHaveBeenCalledWith('/pujas', { locale: 'ne' });
  });
});
