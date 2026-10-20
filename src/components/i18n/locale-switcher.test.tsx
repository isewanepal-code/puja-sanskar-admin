import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test/render';

import { LocaleSwitcher } from './locale-switcher';

const replace = vi.fn();

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/pujas',
  useRouter: () => ({ replace }),
}));

describe('LocaleSwitcher', () => {
  it('offers the other language', () => {
    render(<LocaleSwitcher />);

    expect(screen.getByRole('button', { name: 'नेपालीमा हेर्नुहोस्' })).toHaveTextContent('ने');
  });

  it('keeps the current path when switching language', async () => {
    const { user } = render(<LocaleSwitcher />);

    await user.click(screen.getByRole('button', { name: 'नेपालीमा हेर्नुहोस्' }));

    expect(replace).toHaveBeenCalledWith('/pujas', { locale: 'ne' });
  });
});
