import { describe, expect, it } from 'vitest';

import { render, screen } from '@/test/render';

import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  it('toggles dark mode', async () => {
    const { user } = render(<ThemeToggle />);
    const toggle = screen.getByRole('button', { name: 'Dark mode' });

    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);

    expect(document.documentElement).toHaveClass('dark');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });
});
