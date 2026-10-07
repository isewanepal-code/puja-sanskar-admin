import { expect, test } from '@playwright/test';

test.describe('with a dark system preference', () => {
  test.use({ colorScheme: 'dark' });

  test('applies the dark theme without hydration errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('/');

    await expect(page.locator('html')).toHaveClass(/dark/);
    expect(errors).toEqual([]);
  });
});

test('a stored preference overrides the system theme', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
  await page.goto('/');

  await expect(page.locator('html')).toHaveClass(/dark/);
});
