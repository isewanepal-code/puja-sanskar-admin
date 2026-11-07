import { expect, test } from '@playwright/test';

// The admin is English only, without a locale prefix, and every page but sign-in needs a session.

test('a signed-out visit to the front page goes to sign-in', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login(\?|$)/);
  await expect(page).toHaveTitle('Staff sign in | Puja Sanskar Admin');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('the sign-in form asks for an email and a password', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('an unknown address goes to sign-in too, not to a page of the panel', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');

  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test('search engines are told to keep out', async ({ request }) => {
  const robots = await request.get('/robots.txt');

  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain('Disallow: /');
});
